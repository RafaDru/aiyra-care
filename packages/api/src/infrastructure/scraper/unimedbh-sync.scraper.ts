import type { Page, Response } from 'playwright'
import type { ScraperProgress } from '../../domain/scraper/health-portal-scraper.js'
import type { UnimedBhUsageItem } from './unimedbh-extrato.scraper.js'
import type { UnimedBhAuthorizationItem } from './unimedbh-autorizacoes.scraper.js'
import {
  acquireUnimedBhSession,
  captureUnimedStorageState,
  isUnimedLoginPage,
  unimedSessionExpiredMessage,
  unimedSessionExpiresAt,
} from './unimedbh-login.helper.js'
import { registerSyncBrowser, unregisterSyncBrowser } from '../sync/sync-browser-registry.js'
import {
  scrapeUnimedBhVirtualCardFromPage,
  type UnimedBhVirtualCard,
} from './unimedbh-cartao-virtual.scraper.js'
import { waitForUnimedScreenService } from './unimedbh-wait-response.helper.js'
import {
  captureUnimedAuthorizationPageAssets,
  persistUnimedDeclaracaoCarenciaPdf,
} from './unimedbh-authorization-assets.js'

export interface UnimedBhSyncResult {
  extrato: { paciente: UnimedBhUsageItem[]; dependentes: Record<string, UnimedBhUsageItem[]> }
  autorizacoes: { paciente: UnimedBhAuthorizationItem[]; dependentes: Record<string, UnimedBhAuthorizationItem[]> }
  planCard: UnimedBhVirtualCard | null
  sessionStorageState?: string
  sessionExpiresAt?: Date
}

type OutSystemsListItem = {
  SolicId?: string
  ClienteId?: string
  NumeroPedido?: string
  Senha?: string
  DescricaoTipoSitucaoSolicitacao?: string
  DataEmissao?: string
  DataValidadeAutorizacao?: string
  NomeMedicoSolicitante?: string
  TipoAutorizacao?: string
  ClassificacaoProcCliente?: string
  SolicIdEncriptado?: string
  StatusParcialmenteAutorizada?: boolean
  SolicitanteId?: string
}

type ExtratoUtilRow = {
  ProcedimentoId?: string
  DataAtendimento?: string
  NomePrestador?: string
  NotaFiscal?: string
  DescricaoAtendimento?: string
  ValorCobranca?: string
  QuantidadeProcedRealizado?: number
  ValorCopartEmpresa?: string
  ValorBaseCopart?: string
  PrestadorId?: string
}

type ExtratoBeneficiario = {
  Nome?: string
  Carteira?: string
  CodigoCliente?: string
  codigoCliente?: string
  NumeroCarteira?: string
  UtilizacaoSt?: { List?: ExtratoUtilRow[] }
}

const DETAIL_BASE = 'https://app.unimedbh.com.br/PortalDoCliente/AutorizacoesDetalhe?InSolicIdEncriptado='
const LIST_URL = 'https://app.unimedbh.com.br/PortalDoCliente/AutorizacoesExames'
const EXTRATO_URL = 'https://app.unimedbh.com.br/PortalDoCliente/ExtratoUtilizacao'
const EXTRATO_MONTHS_DEFAULT = 6

function parseUnimedPortalDate(iso?: string): Date | null {
  if (!iso || iso.startsWith('1900')) return null
  const normalized = iso.includes('T') ? iso : `${iso}T12:00:00Z`
  const d = new Date(normalized)
  return isNaN(d.getTime()) ? null : d
}

function authorizationWithinWindow(item: OutSystemsListItem, since: Date): boolean {
  const emissao = parseUnimedPortalDate(item.DataEmissao)
  const validade = parseUnimedPortalDate(item.DataValidadeAutorizacao)
  const ref = emissao ?? validade
  if (!ref) return true
  return ref >= since
}

function waitForScreenService(page: Page, pathPart: string, timeout = 45000): Promise<Response> {
  return waitForUnimedScreenService(page, pathPart, timeout)
}

function formatIsoDate(iso?: string): string {
  if (!iso || iso.startsWith('1900')) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function mapStatus(raw?: string): string {
  const s = (raw || '').toUpperCase()
  if (s.includes('AUTORI')) return 'authorized'
  if (s.includes('UTILIZ') || s.includes('USAD')) return 'used'
  if (s.includes('EXPIR') || s.includes('VENC')) return 'expired'
  if (s.includes('CANCEL') || s.includes('NEGAD')) return 'cancelled'
  return raw || 'authorized'
}

function classifyUsage(description: string): UnimedBhUsageItem['kind'] {
  const d = description.toUpperCase()
  if (d.includes('CONSULTA')) return 'consulta'
  if (d.includes('EXAME') || d.includes('DOSAGEM') || d.includes('LABORATOR') || d.includes('HEMOGRAMA') || d.includes('COLESTEROL')) {
    return 'exame'
  }
  return 'outro'
}

function parseAmount(raw?: string): number | undefined {
  if (!raw) return undefined
  const n = Number(String(raw).replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

function flattenExtratoPayload(data: {
  ExtratoUtilizacao?: { List?: ExtratoBeneficiario[] }
}): UnimedBhUsageItem[] {
  const items: UnimedBhUsageItem[] = []
  for (const benef of data.ExtratoUtilizacao?.List ?? []) {
    for (const u of benef.UtilizacaoSt?.List ?? []) {
      if (!u.DataAtendimento || u.DataAtendimento.startsWith('1900')) continue
      const description = u.DescricaoAtendimento || ''
      if (!description && !u.NomePrestador) continue
      const dateIso = u.DataAtendimento.includes('T') ? u.DataAtendimento : `${u.DataAtendimento}T12:00:00Z`
      items.push({
        patientName: benef.Nome || '',
        cardNumber: benef.Carteira || benef.CodigoCliente || benef.codigoCliente || benef.NumeroCarteira || '',
        procedureDate: formatIsoDate(dateIso),
        procedureDescription: description,
        doctorName: u.NomePrestador || '',
        value: u.ValorCobranca ? `R$ ${u.ValorCobranca}` : '',
        invoiceNumber: u.NotaFiscal || '',
        quantity: String(u.QuantidadeProcedRealizado ?? 1),
        kind: classifyUsage(description),
        providerExternalId: u.PrestadorId && u.PrestadorId !== '0' ? u.PrestadorId : undefined,
        procedureExternalId: u.ProcedimentoId && u.ProcedimentoId !== '0' ? u.ProcedimentoId : undefined,
        chargedAmount: parseAmount(u.ValorCobranca),
        copartCompanyAmount: parseAmount(u.ValorCopartEmpresa),
        copartBaseAmount: parseAmount(u.ValorBaseCopart),
      })
    }
  }
  return items
}


export type UnimedBhScrapeOpts = {
  patientName?: string
  cardNumber?: string
  storageStateJson?: string
  jobId?: string
  /** Competências do extrato (default 6). Sync silencioso usa 2. */
  extratoMonths?: number
  /** Só detalha autorizações com emissão/validade >= esta data. */
  authorizationSince?: Date | null
  patientId?: string
  /** Em sync full, baixa PDF DeclaracaoCarencia. */
  fetchCarenciaPdf?: boolean
}

export class UnimedBhSyncScraper {
  async scrape(
    email: string,
    password: string,
    onProgress?: (p: ScraperProgress) => void,
    opts?: UnimedBhScrapeOpts,
  ): Promise<UnimedBhSyncResult> {
    const emit = (step: string, message: string, status: ScraperProgress['status']) => onProgress?.({ step, message, status })

    const { browser, context, page, usedStoredSession } = await acquireUnimedBhSession(
      email,
      password,
      { storageStateJson: opts?.storageStateJson },
    )

    if (opts?.jobId) registerSyncBrowser(opts.jobId, browser)

    try {
      if (usedStoredSession) {
        emit('login', 'Sessão Unimed salva (sem login)...', 'success')
      } else {
        emit('login', 'Login realizado!', 'success')
      }

      emit('fetch-plano', 'Buscando dados do plano (Cartão Virtual)...', 'running')
      let planCard: UnimedBhVirtualCard | null = null
      try {
        planCard = await scrapeUnimedBhVirtualCardFromPage(page, {
          patientName: opts?.patientName,
          cardNumber: opts?.cardNumber,
          requireToken: false,
        })
        emit('fetch-plano', planCard ? 'Plano obtido do Cartão Virtual' : 'Plano não disponível nesta sessão', 'running')
      } catch {
        emit('fetch-plano', 'Não foi possível obter o plano agora (seguindo com dados clínicos)', 'running')
      }

      const extratoMonths = opts?.extratoMonths ?? EXTRATO_MONTHS_DEFAULT
      const extrato = await this.scrapeExtrato(page, emit, extratoMonths)
      const autorizacoes = await this.scrapeAutorizacoes(page, emit, opts?.authorizationSince ?? null, opts)

      if (opts?.fetchCarenciaPdf && opts.patientId) {
        emit('fetch-plano', 'Baixando Declaração de Carência...', 'running')
        try {
          await persistUnimedDeclaracaoCarenciaPdf({ page, patientId: opts.patientId })
          emit('fetch-plano', 'Declaração de Carência salva', 'running')
        } catch {
          emit('fetch-plano', 'Declaração de Carência não disponível', 'running')
        }
      }

      const sessionStorageState = await captureUnimedStorageState(context)

      return {
        extrato,
        autorizacoes,
        planCard,
        sessionStorageState,
        sessionExpiresAt: unimedSessionExpiresAt(),
      }
    } finally {
      if (opts?.jobId) await unregisterSyncBrowser(opts.jobId)
      else await browser.close()
    }
  }

  private assertUnimedPortalSession(page: Page): void {
    if (isUnimedLoginPage(page.url())) {
      throw new Error(unimedSessionExpiredMessage(page.url()))
    }
  }

  private async scrapeExtrato(
    page: Page,
    emit: (step: string, msg: string, status: ScraperProgress['status']) => void,
    extratoMonths: number,
  ) {
    const incremental = extratoMonths < EXTRATO_MONTHS_DEFAULT
    emit(
      'fetch-extrato',
      incremental
        ? `Buscando extrato (últimos ${extratoMonths} meses)...`
        : 'Buscando extrato de utilização (API)...',
      'running',
    )

    const collected: UnimedBhUsageItem[] = []
    const seenKeys = new Set<string>()

    const ingest = (data: { ExtratoUtilizacao?: { List?: ExtratoBeneficiario[] } }) => {
      for (const item of flattenExtratoPayload(data)) {
        const key = `${item.cardNumber}|${item.procedureDate}|${item.procedureDescription}|${item.invoiceNumber}|${item.doctorName}`
        if (seenKeys.has(key)) continue
        seenKeys.add(key)
        collected.push(item)
      }
    }

    const firstWait = waitForScreenService(page, 'DataActionListarExtratoUtilizacao').catch(() => null)
    const compWait = waitForScreenService(page, 'DataActionListarCompetencias').catch(() => null)
    await page.goto(EXTRATO_URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
    this.assertUnimedPortalSession(page)
    const [firstRes, compRes] = await Promise.all([firstWait, compWait])
    if (firstRes) {
      const firstJson = (await firstRes.json().catch(() => null)) as {
        data?: { ExtratoUtilizacao?: { List?: ExtratoBeneficiario[] } }
      } | null
      if (firstJson?.data) ingest(firstJson.data)
    }

    type Competencia = { Data?: string; DataFormatada?: string }
    let competencias: Competencia[] = []
    if (compRes) {
      const compJson = await compRes.json() as { data?: { ListaCompetencia?: { List?: Competencia[] } } }
      competencias = compJson.data?.ListaCompetencia?.List ?? []
    }

    // Current month already loaded; walk previous months via UI labels
    const toVisit = competencias
      .map((c) => c.DataFormatada)
      .filter((label): label is string => !!label)
      .slice(1, extratoMonths)

    for (const label of toVisit) {
      emit('fetch-extrato', `Extrato: ${label}...`, 'running')
      const monthWait = waitForScreenService(page, 'DataActionListarExtratoUtilizacao', 15000).catch(() => null)
      const loc = page.getByText(label, { exact: true }).first()
      if (!(await loc.count())) continue
      await loc.click({ force: true }).catch(() => {})
      const monthRes = await monthWait
      if (!monthRes) continue
      const monthJson = await monthRes.json() as { data?: { ExtratoUtilizacao?: { List?: ExtratoBeneficiario[] } } }
      if (monthJson.data) ingest(monthJson.data)
    }

    const consultas = collected.filter((i) => i.kind === 'consulta').length
    emit('fetch-extrato', `${collected.length} utilizações (${consultas} consultas)`, 'running')
    return { paciente: collected, dependentes: {} as Record<string, UnimedBhUsageItem[]> }
  }

  private async scrapeAutorizacoes(
    page: Page,
    emit: (step: string, msg: string, status: ScraperProgress['status']) => void,
    authorizationSince: Date | null,
    scrapeOpts?: UnimedBhScrapeOpts,
  ) {
    emit(
      'fetch-autorizacoes',
      authorizationSince
        ? 'Buscando autorizações recentes (API OutSystems)...'
        : 'Buscando autorizações (API OutSystems)...',
      'running',
    )

    const listWait = waitForScreenService(page, 'DataActionListarSolicCliente').catch(() => null)
    await page.goto(LIST_URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
    this.assertUnimedPortalSession(page)
    const listRes = await listWait
    if (!listRes) {
      return { paciente: [], dependentes: {} as Record<string, UnimedBhAuthorizationItem[]> }
    }
    const listJson = (await listRes.json().catch(() => null)) as {
      data?: {
        LocalDadosAutorizacaoAUTORIZACOES?: { List?: OutSystemsListItem[] }
        LocalDadosAutorizacaoEXAMES?: { List?: OutSystemsListItem[] }
      }
    } | null

    const rawList = [
      ...(listJson.data?.LocalDadosAutorizacaoAUTORIZACOES?.List ?? []),
      ...(listJson.data?.LocalDadosAutorizacaoEXAMES?.List ?? []),
    ]

    const bySolic = new Map<string, OutSystemsListItem>()
    for (const item of rawList) {
      const key = item.SolicIdEncriptado || item.SolicId || item.NumeroPedido || crypto.randomUUID()
      if (!bySolic.has(key)) bySolic.set(key, item)
    }

    const paciente: UnimedBhAuthorizationItem[] = []
    let index = 0
    let skippedDetails = 0
    for (const item of bySolic.values()) {
      if (authorizationSince && !authorizationWithinWindow(item, authorizationSince)) {
        paciente.push(this.mapListItemOnly(item))
        skippedDetails++
        continue
      }
      index++
      emit('fetch-autorizacoes', `Detalhando autorização ${index}/${bySolic.size - skippedDetails}...`, 'running')
      const enriched = await this.scrapeAuthorizationDetail(page, item, scrapeOpts)
      paciente.push(enriched)
    }

    const detailMsg = skippedDetails > 0
      ? `${paciente.length} autorizações (${index} com detalhe, ${skippedDetails} só lista)`
      : `${paciente.length} autorizações com detalhe`
    emit('fetch-autorizacoes', detailMsg, 'running')
    return { paciente, dependentes: {} as Record<string, UnimedBhAuthorizationItem[]> }
  }

  private async scrapeAuthorizationDetail(
    page: Page,
    listItem: OutSystemsListItem,
    scrapeOpts?: UnimedBhScrapeOpts,
  ): Promise<UnimedBhAuthorizationItem> {
    const enc = listItem.SolicIdEncriptado
    if (!enc) {
      return this.mapListItemOnly(listItem)
    }

    const infoWait = waitForScreenService(page, 'DataActionObterInformacoesSolicitacao').catch(() => null)
    const histWait = waitForScreenService(page, 'DataActionListarHistoricoSolic').catch(() => null)
    const prestadorWait = waitForScreenService(page, 'DataActionObterPrestador').catch(() => null)
    const infoPrestWait = waitForScreenService(page, 'DataActionObterInfoPrestador').catch(() => null)

    await page.goto(`${DETAIL_BASE}${enc}`, { waitUntil: 'domcontentloaded', timeout: 45000 })

    const [infoRes, histRes, prestadorRes, infoPrestRes] = await Promise.all([infoWait, histWait, prestadorWait, infoPrestWait])
    if (!infoRes) {
      return this.mapListItemOnly(listItem)
    }

    const infoJson = await infoRes.json() as { data?: {
      ListaProcedimento?: { List?: Array<{
        ProcedimentoId?: string
        CodigoItem?: string
        DescricaoItem?: string
        QuantidadeSolicitada?: string
        QuantidadeAutorizada?: string
        StatusItem?: string
      }> }
    } }

    const histJson = histRes ? await histRes.json() as { data?: {
      HistoricoSolicitacaoList?: { List?: Array<{
        CodigoSituacaoSolicitacao?: string
        DataOcorrencia?: string
        NomeAuditor?: string
        Descricao?: string
      }> }
    } } : null

    const prestadorJson = prestadorRes ? await prestadorRes.json() as { data?: {
      Prestador?: { Especialidade?: string; NomePrestador?: string }
    } } : null

    const infoPrestJson = infoPrestRes ? await infoPrestRes.json() as { data?: {
      Especialidades?: string
      ListaEnderecoTelefone?: { List?: Array<{
        EnderecoFormatado?: string
        Cidade?: string
        SiglaEstado?: string
        Latitude?: string
        Longitude?: string
        Telefone?: { List?: string[] }
      }> }
    } } : null

    const pageCrm = await page.evaluate(() => {
      const text = document.body.innerText
      const m = text.match(/CRM\s*\n\s*(\d+)/i) || text.match(/CRM[:\s]+(\d+)/i)
      return m?.[1] ?? ''
    })

    const procedures = infoJson.data?.ListaProcedimento?.List ?? []
    const locations = (infoPrestJson?.data?.ListaEnderecoTelefone?.List ?? []).map((loc) => ({
      formattedAddress: loc.EnderecoFormatado || undefined,
      phone: loc.Telefone?.List?.[0] || undefined,
      city: loc.Cidade || undefined,
      state: loc.SiglaEstado || undefined,
      latitude: loc.Latitude || undefined,
      longitude: loc.Longitude || undefined,
    }))

    const history = (histJson?.data?.HistoricoSolicitacaoList?.List ?? []).map((h) => ({
      code: h.CodigoSituacaoSolicitacao || undefined,
      description: h.Descricao || h.CodigoSituacaoSolicitacao || undefined,
      occurredAt: h.DataOcorrencia || undefined,
      auditorName: h.NomeAuditor || undefined,
    }))

    const specialty = prestadorJson?.data?.Prestador?.Especialidade
      || infoPrestJson?.data?.Especialidades
      || ''
    const doctorName = prestadorJson?.data?.Prestador?.NomePrestador
      || listItem.NomeMedicoSolicitante
      || ''

    const firstLoc = locations[0]
    const primaryDescription = listItem.ClassificacaoProcCliente
      || procedures[0]?.DescricaoItem
      || ''

    const solicitationNumber = listItem.NumeroPedido || ''
    let doctorPhotoUrl: string | undefined
    let guideDocumentId: string | undefined
    if (scrapeOpts?.patientId && solicitationNumber) {
      try {
        const assets = await captureUnimedAuthorizationPageAssets({
          page,
          patientId: scrapeOpts.patientId,
          solicitationNumber,
        })
        doctorPhotoUrl = assets.doctorPhotoUrl
        guideDocumentId = assets.guideDocumentId
      } catch {
        // assets opcionais — não bloqueia sync
      }
    }

    return {
      patientName: '',
      procedureCode: procedures[0]?.CodigoItem || '',
      procedureDescription: primaryDescription,
      doctorName,
      doctorCouncil: pageCrm ? `CRM ${pageCrm}` : '',
      clinicName: firstLoc?.formattedAddress || '',
      authorizationDate: formatIsoDate(listItem.DataEmissao),
      validityDate: formatIsoDate(listItem.DataValidadeAutorizacao),
      status: mapStatus(listItem.DescricaoTipoSitucaoSolicitacao),
      guideNumber: listItem.NumeroPedido || '',
      quantity: String(procedures.length || 1),
      solicitationNumber: listItem.NumeroPedido || '',
      guidePassword: listItem.Senha || '',
      specialty,
      solicitationUrl: `${DETAIL_BASE}${enc}`,
      solicId: listItem.SolicId || '',
      solicIdEncrypted: enc,
      doctorPhotoUrl,
      guideDocumentId,
      authorizationType: listItem.TipoAutorizacao || '',
      classification: listItem.ClassificacaoProcCliente || '',
      providerExternalId: listItem.SolicitanteId && listItem.SolicitanteId !== '0' ? listItem.SolicitanteId : undefined,
      localAddress: firstLoc?.formattedAddress || '',
      localPhone: firstLoc?.phone || '',
      locations,
      history,
      items: procedures.map((p) => ({
        procedureCode: p.CodigoItem || undefined,
        procedureDescription: p.DescricaoItem || 'Procedimento',
        quantityRequested: p.QuantidadeSolicitada ? Number(p.QuantidadeSolicitada) : undefined,
        quantityAuthorized: p.QuantidadeAutorizada ? Number(p.QuantidadeAutorizada) : undefined,
        status: mapStatus(p.StatusItem),
        externalProcedureId: p.ProcedimentoId && p.ProcedimentoId !== '0' ? p.ProcedimentoId : undefined,
      })),
    }
  }

  private mapListItemOnly(listItem: OutSystemsListItem): UnimedBhAuthorizationItem {
    return {
      patientName: '',
      procedureCode: '',
      procedureDescription: listItem.ClassificacaoProcCliente || '',
      doctorName: listItem.NomeMedicoSolicitante || '',
      doctorCouncil: '',
      clinicName: '',
      authorizationDate: formatIsoDate(listItem.DataEmissao),
      validityDate: formatIsoDate(listItem.DataValidadeAutorizacao),
      status: mapStatus(listItem.DescricaoTipoSitucaoSolicitacao),
      guideNumber: listItem.NumeroPedido || '',
      quantity: '1',
      solicitationNumber: listItem.NumeroPedido || '',
      guidePassword: listItem.Senha || '',
      solicId: listItem.SolicId || '',
      solicIdEncrypted: listItem.SolicIdEncriptado || '',
      authorizationType: listItem.TipoAutorizacao || '',
      classification: listItem.ClassificacaoProcCliente || '',
      providerExternalId: listItem.SolicitanteId && listItem.SolicitanteId !== '0' ? listItem.SolicitanteId : undefined,
      items: [],
    }
  }
}
