/**
 * Captura screenshots reais para a landing (packages/web/public/landing/*.png).
 *
 * Auth: SUPABASE_URL + SUPABASE_SERVICE_ROLE no .env — magic link do primeiro usuário auth.
 * Requer: API + web dev rodando.
 *
 * Uso: cd packages/api && node scripts/capture-landing-screenshots.mjs
 */
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdir } from 'fs/promises'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const webBase = (process.env.LANDING_CAPTURE_WEB_URL ?? process.env.WEB_PUBLIC_URL ?? 'http://localhost:5173').replace(/\/$/, '')
const outDir = resolve(root, 'packages/web/public/landing')
const supabaseUrl = process.env.SUPABASE_URL?.trim()
const serviceRole = process.env.SUPABASE_SERVICE_ROLE?.trim()
const dbUrl = process.env.SUPABASE_POOL_URL?.trim() || process.env.DATABASE_URL?.trim()

async function resolveCaptureEmail() {
  if (process.env.LANDING_CAPTURE_EMAIL?.trim()) {
    return process.env.LANDING_CAPTURE_EMAIL.trim()
  }
  if (!dbUrl) throw new Error('DATABASE_URL ou SUPABASE_POOL_URL necessário para resolver e-mail')
  const pool = new pg.Pool({ connectionString: dbUrl, ssl: dbUrl.includes('supabase') ? { rejectUnauthorized: false } : undefined })
  try {
    const res = await pool.query(
      `SELECT email FROM auth.users
       WHERE email IS NOT NULL
         AND email NOT LIKE '%@example.%'
         AND email NOT LIKE '%.invalid'
       ORDER BY last_sign_in_at DESC NULLS LAST, created_at ASC
       LIMIT 1`,
    )
    const email = res.rows[0]?.email
    if (!email) throw new Error('Nenhum usuário em auth.users')
    return email
  } finally {
    await pool.end()
  }
}

async function magicLoginLink(email) {
  if (!supabaseUrl || !serviceRole) {
    throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE necessários')
  }
  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${webBase}/` },
  })
  if (error) throw error
  const link = data.properties?.action_link
  if (!link) throw new Error('generateLink não retornou action_link')
  return link
}

async function capture(page, fileName) {
  const filePath = resolve(outDir, `${fileName}.png`)
  await page.screenshot({ path: filePath, animations: 'disabled' })
  console.log(`  ✓ ${fileName}.png`)
}

async function main() {
  await mkdir(outDir, { recursive: true })
  const email = await resolveCaptureEmail()
  console.log(`Web: ${webBase}`)
  console.log(`Auth: magic link (${email})`)

  const loginLink = await magicLoginLink(email)
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    await page.goto(loginLink, { waitUntil: 'networkidle', timeout: 120000 })
    await page.waitForURL((url) => !url.href.includes('token') && !url.pathname.includes('/login'), { timeout: 120000 })
    if (page.url().includes('compliance')) {
      await page.waitForURL((url) => !url.pathname.includes('compliance'), { timeout: 120000 })
    }

    await page.goto(`${webBase}/`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500)
    await capture(page, 'dashboard')

    const patientCard = page.locator('.ant-card.ant-card-hoverable').first()
    await patientCard.waitFor({ state: 'visible', timeout: 20000 })
    await patientCard.click()
    await page.waitForURL(/\/patients\//, { timeout: 30000 })
    await page.waitForTimeout(2000)
    await capture(page, 'patient-overview')

    const clickSection = async (label) => {
      const seg = page.locator('.ant-segmented-item').filter({ hasText: label }).first()
      if (await seg.isVisible()) {
        await seg.click()
        await page.waitForTimeout(1500)
      }
    }
    const clickTab = async (pattern) => {
      const tab = page.locator('.ant-tabs-tab').filter({ hasText: pattern }).first()
      if (await tab.isVisible()) {
        await tab.click()
        await page.waitForTimeout(2000)
        return true
      }
      return false
    }

    await clickSection('Agenda')
    if (await clickTab(/agenda/i)) await capture(page, 'agenda')
    const timelineView = page.getByRole('radio', { name: /linha do tempo|timeline/i }).or(page.locator('button, .ant-segmented-item').filter({ hasText: /linha do tempo|timeline/i }))
    if (await timelineView.first().isVisible()) {
      await timelineView.first().click()
      await page.waitForTimeout(2000)
      await capture(page, 'timeline')
    }

    await clickSection('Clínico')
    if (await clickTab(/exames/i)) await capture(page, 'exams')

    const avaOrb = page.locator('button[aria-label*="Ava"], button[title*="Ava"]').first()
    const avaImg = page.locator('img[src*="ava"]').first()
    if (await avaOrb.isVisible()) {
      await avaOrb.click()
    } else if (await avaImg.isVisible()) {
      await avaImg.click({ force: true })
    } else {
      await page.locator('button').filter({ has: page.locator('img[src*="ava"]') }).first().click({ force: true })
    }
    await page.waitForTimeout(3000)
    await capture(page, 'ava-chat')

    console.log('Screenshots capturados em public/landing/')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
