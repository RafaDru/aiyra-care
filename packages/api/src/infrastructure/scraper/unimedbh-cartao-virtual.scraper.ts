import type { Page, Response } from 'playwright'
import { loginUnimedBh } from './unimedbh-login.helper.js'
import type { PlanAddOn } from '../../domain/insurance-plan/insurance-plan.entity.js'
import { waitForUnimedScreenService } from './unimedbh-wait-response.helper.js'

const CARTAO_VIRTUAL_URL = 'https://app.unimedbh.com.br/PortalDoCliente/CartaoVirtual'

export interface UnimedBhVirtualCard {
  token: string
  qrCode: string
  expiresAt: string | null
  cardNumber: string
  holderName: string
  productCode: string | null
  planName: string | null
  operatorName: string | null
  networkName: string | null
  segmentation: string | null
  accommodation: string | null
  geographicCoverage: string | null
  regulationType: string | null
  contractType: string | null
  contractorName: string | null
  cns: string | null
  inclusionDate: string | null
  cardValidFrom: string | null
  cardValidTo: string | null
  addOns: PlanAddOn[]
  externalKey: string
  raw: Record<string, unknown>
}

type OsTokenPayload = {
  Token?: string
  QRCode?: string
  DataValidadeToken?: string
}

type OsCardPayload = {
  codigoCliente?: string
  CodigoCliente?: string
  nomeClienteCartao?: string
  NomeClienteCartao?: string
  nomeSocialCliente?: string
  NomeSocialCliente?: string
  codigoProdutoUnimedAns?: string
  CodigoProdutoUnimedAns?: string
  nomeUnimedOrigem?: string
  NomeUnimedOrigem?: string
  nomeUnimedOrigem2?: string
  NomeUnimedOrigem2?: string
  tipoCoberturaANs?: string
  TipoCoberturaANs?: string
  tipoAcomodacao?: string
  TipoAcomodacao?: string
  tipoAbrangencia?: string
  TipoAbrangencia?: string
  tipoRegulamentacao?: string
  TipoRegulamentacao?: string
  tipoContratacao?: string
  TipoContratacao?: string
  nomeContratanteCliente?: string
  NomeContratanteCliente?: string
  numeroCartaoNacionalSaude?: string
  NumeroCartaoNacionalSaude?: string
  dataInclusaoCliente?: string
  DataInclusaoCliente?: string
  dataValidadeInicialCartao?: string
  DataValidadeInicialCartao?: string
  dataValidadeFinalCartao?: string
  DataValidadeFinalCartao?: string
  informacaoAdcionalVerso?: string
  InformacaoAdcionalVerso?: string
  tipoProduto?: string
  TipoProduto?: string
}

function waitForScreenService(page: Page, pathPart: string, timeout = 45000): Promise<Response> {
  return waitForUnimedScreenService(page, pathPart, timeout)
}

function normalizeName(name: string | null | undefined): string {
  return (name || '').normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/\s+/g, ' ').trim()
}

function pick(card: OsCardPayload, ...keys: (keyof OsCardPayload)[]): string {
  for (const key of keys) {
    const v = card[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

function parseOsDate(raw?: string | null): string | null {
  if (!raw) return null
  const m = /\/Date\((-?\d+)/.exec(raw)
  if (m) {
    const d = new Date(Number(m[1]))
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function parseAddOns(raw: string): PlanAddOn[] {
  if (!raw) return []
  return raw
    .split(/[;|/•\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((description) => ({ description }))
}

function mapVirtualCard(data: {
  DadosTokenQRCode?: OsTokenPayload
  DadosCartaoCliente?: OsCardPayload
}): UnimedBhVirtualCard | null {
  const tokenData = data.DadosTokenQRCode
  const card = data.DadosCartaoCliente ?? {}
  const token = tokenData?.Token?.trim() || ''
  const qrCode = tokenData?.QRCode?.trim() || token
  if (!token && !qrCode && !pick(card, 'codigoCliente', 'CodigoCliente')) return null

  const cardNumber = pick(card, 'codigoCliente', 'CodigoCliente')
  const productCode = pick(card, 'codigoProdutoUnimedAns', 'CodigoProdutoUnimedAns') || null
  const operatorName = pick(card, 'nomeUnimedOrigem', 'NomeUnimedOrigem') || 'Unimed BH'
  const productType = pick(card, 'tipoProduto', 'TipoProduto')
  const planName = productType || productCode || operatorName || 'Plano Unimed BH'
  const addOnRaw = pick(card, 'informacaoAdcionalVerso', 'InformacaoAdcionalVerso')

  return {
    token: token || qrCode || cardNumber,
    qrCode: qrCode || token || cardNumber,
    expiresAt: parseOsDate(tokenData?.DataValidadeToken),
    cardNumber,
    holderName: pick(card, 'nomeClienteCartao', 'NomeClienteCartao', 'nomeSocialCliente', 'NomeSocialCliente'),
    productCode,
    planName,
    operatorName,
    networkName: pick(card, 'nomeUnimedOrigem2', 'NomeUnimedOrigem2') || operatorName || null,
    segmentation: pick(card, 'tipoCoberturaANs', 'TipoCoberturaANs') || null,
    accommodation: pick(card, 'tipoAcomodacao', 'TipoAcomodacao') || null,
    geographicCoverage: pick(card, 'tipoAbrangencia', 'TipoAbrangencia') || null,
    regulationType: pick(card, 'tipoRegulamentacao', 'TipoRegulamentacao') || null,
    contractType: pick(card, 'tipoContratacao', 'TipoContratacao') || null,
    contractorName: pick(card, 'nomeContratanteCliente', 'NomeContratanteCliente') || null,
    cns: pick(card, 'numeroCartaoNacionalSaude', 'NumeroCartaoNacionalSaude') || null,
    inclusionDate: parseOsDate(pick(card, 'dataInclusaoCliente', 'DataInclusaoCliente')),
    cardValidFrom: parseOsDate(pick(card, 'dataValidadeInicialCartao', 'DataValidadeInicialCartao')),
    cardValidTo: parseOsDate(pick(card, 'dataValidadeFinalCartao', 'DataValidadeFinalCartao')),
    addOns: parseAddOns(addOnRaw),
    externalKey: productCode || cardNumber || `unimed-card-${Date.now()}`,
    raw: card as Record<string, unknown>,
  }
}

async function readGetDataAction(res: Response): Promise<UnimedBhVirtualCard | null> {
  const json = await res.json() as { data?: Parameters<typeof mapVirtualCard>[0] }
  if (!json.data) return null
  return mapVirtualCard(json.data)
}

async function trySelectBeneficiary(page: Page, patientName?: string, cardNumber?: string): Promise<UnimedBhVirtualCard | null> {
  if (!patientName && !cardNumber) return null

  const targetName = normalizeName(patientName)
  const targetCard = (cardNumber || '').replace(/\s/g, '')

  const candidates = page.locator('[role="radio"], label, button, [class*="cliente"], [class*="Cliente"]')
  const count = await candidates.count().catch(() => 0)
  for (let i = 0; i < Math.min(count, 40); i++) {
    const el = candidates.nth(i)
    const text = normalizeName(await el.innerText().catch(() => ''))
    if (!text) continue
    const matchesName = targetName && text.includes(targetName)
    const matchesCard = targetCard && text.replace(/\s/g, '').includes(targetCard)
    if (!matchesName && !matchesCard) continue

    const wait = waitForScreenService(page, 'DataActionGetDataAction', 20000).catch(() => null)
    await el.click({ force: true }).catch(() => {})
    const res = await wait
    if (!res) continue
    const mapped = await readGetDataAction(res)
    if (mapped) return mapped
  }
  return null
}

/** Scrape Cartão Virtual using an already-authenticated PortalDoCliente page. */
export async function scrapeUnimedBhVirtualCardFromPage(
  page: Page,
  opts?: { patientName?: string; cardNumber?: string; requireToken?: boolean },
): Promise<UnimedBhVirtualCard | null> {
  const firstWait = waitForScreenService(page, 'DataActionGetDataAction')
  await page.goto(CARTAO_VIRTUAL_URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
  const firstRes = await firstWait
  let card = await readGetDataAction(firstRes)

  await page.waitForTimeout(800)
  const selected = await trySelectBeneficiary(page, opts?.patientName, opts?.cardNumber)
  if (selected) card = selected

  const hasIdentity = !!(card?.token || card?.qrCode || card?.cardNumber || card?.productCode || card?.planName)
  if (!hasIdentity) return null

  if (opts?.requireToken !== false && !card?.token && !card?.qrCode && !card?.cardNumber) {
    return null
  }

  if (opts?.patientName && card?.holderName && normalizeName(card.holderName) !== normalizeName(opts.patientName)) {
    const again = await trySelectBeneficiary(page, opts.patientName, opts.cardNumber)
    if (again) card = again
  }

  return card
}

export class UnimedBhCartaoVirtualScraper {
  async scrape(
    email: string,
    password: string,
    opts?: { patientName?: string; cardNumber?: string },
  ): Promise<UnimedBhVirtualCard> {
    const { browser, page } = await loginUnimedBh(email, password)

    try {
      const card = await scrapeUnimedBhVirtualCardFromPage(page, { ...opts, requireToken: true })
      if (!card?.token && !card?.qrCode && !card?.cardNumber) {
        throw new Error('Não foi possível obter token/QR Code do Cartão Virtual Unimed')
      }
      return card!
    } finally {
      await browser.close()
    }
  }
}
