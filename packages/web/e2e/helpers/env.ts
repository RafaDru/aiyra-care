import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

const e2eEnvPath = resolve(process.cwd(), '.env.e2e.local')

export type E2eEnv = {
  QA_TEST_EMAIL?: string
  QA_TEST_PASSWORD?: string
  QA_ONBOARDING_EMAIL?: string
  QA_ONBOARDING_PASSWORD?: string
  QA_ONBOARDING_AUTH_SUBJECT?: string
}

export function loadE2eEnv(): E2eEnv {
  const fromFile: E2eEnv = {}
  if (existsSync(e2eEnvPath)) {
    for (const line of readFileSync(e2eEnvPath, 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx <= 0) continue
      const key = trimmed.slice(0, idx).trim()
      const value = trimmed.slice(idx + 1).trim()
      ;(fromFile as Record<string, string>)[key] = value
    }
  }
  return {
    QA_TEST_EMAIL: process.env.QA_TEST_EMAIL?.trim() ?? fromFile.QA_TEST_EMAIL,
    QA_TEST_PASSWORD: process.env.QA_TEST_PASSWORD?.trim() ?? fromFile.QA_TEST_PASSWORD,
    QA_ONBOARDING_EMAIL: process.env.QA_ONBOARDING_EMAIL?.trim() ?? fromFile.QA_ONBOARDING_EMAIL,
    QA_ONBOARDING_PASSWORD:
      process.env.QA_ONBOARDING_PASSWORD?.trim() ?? fromFile.QA_ONBOARDING_PASSWORD,
    QA_ONBOARDING_AUTH_SUBJECT:
      process.env.QA_ONBOARDING_AUTH_SUBJECT?.trim() ?? fromFile.QA_ONBOARDING_AUTH_SUBJECT,
  }
}

export function requireQaTestCredentials(): { email: string; password: string } {
  const env = loadE2eEnv()
  const email = env.QA_TEST_EMAIL?.trim()
  const password = env.QA_TEST_PASSWORD?.trim()
  if (!email || !password) {
    throw new Error('Defina QA_TEST_EMAIL e QA_TEST_PASSWORD — npm run qa:create-test-user')
  }
  return { email, password }
}

export function requireOnboardingCredentials(): { email: string; password: string } {
  const env = loadE2eEnv()
  const email = env.QA_ONBOARDING_EMAIL?.trim()
  const password = env.QA_ONBOARDING_PASSWORD?.trim()
  if (!email || !password) {
    throw new Error('Defina QA_ONBOARDING_* — npm run qa:create-onboarding-user')
  }
  return { email, password }
}
