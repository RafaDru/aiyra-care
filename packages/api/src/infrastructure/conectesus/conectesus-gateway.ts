import { chromium } from 'playwright'
import type { ScrapedVaccine, ScrapedExam, ScraperResult } from '../../domain/scraper/scraper-types.js'
import type { ScraperProgress } from '../../domain/scraper/health-portal-scraper.js'
import type { FhirBundle, FhirPatient, FhirList, FhirComposition, FhirIdentifier } from './fhir-types.js'

const TOKEN_URL = '**/govbr-proxy.saude.gov.br/api/token/gerar*'
const FHIR_GATEWAY = 'https://ehr-search-gateway.saude.gov.br/api/fhir/r4'
const COMPOSITION_BASE = 'https://mg-ehr-services.saude.gov.br/1.15/api/fhir/r4'
const LOGIN_TIMEOUT = 5 * 60 * 1000

export class ConecteSUSGateway {
  private accessToken = ''

  async loginViaBrowser(onProgress?: (p: ScraperProgress) => void): Promise<string> {
    const emit = (step: string, message: string, status: ScraperProgress['status']) => onProgress?.({ step, message, status })

    const browser = await chromium.launch({
      headless: false,
      channel: 'chrome',
      args: ['--disable-blink-features=AutomationControlled'],
    })
    const context = await browser.newContext({
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
    })
    await context.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false })
    })
    const page = await context.newPage()

    try {
      const tokenPromise = page.waitForResponse(r => r.url().includes('govbr-proxy.saude.gov.br/api/token/gerar') && r.status() === 200, { timeout: LOGIN_TIMEOUT })

      emit('navigate', 'Abrindo Meu SUS Digital...', 'running')
      await page.goto('https://meususdigital.saude.gov.br/login', { waitUntil: 'networkidle' })

      const isGovBr = page.url().includes('sso.acesso.gov.br')
      if (!isGovBr) {
        emit('login', 'Clique em "Entrar com Gov.br" no navegador', 'running')
        const btn = await page.waitForSelector('text=Entrar com Gov.br', { timeout: 15000 }).catch(() => null)
        if (btn) {
          await btn.click()
          await page.waitForTimeout(3000)
        }
      }

      emit('login', 'Faça login no gov.br na janela aberta. Aguardando...', 'running')

      const response = await tokenPromise
      const body = await response.json()
      this.accessToken = body.access_token

      emit('login', 'Login detectado! Coletando dados...', 'success')
      return this.accessToken
    } finally {
      await browser.close()
    }
  }

  private async fhirGet<T>(path: string): Promise<T> {
    const url = `${FHIR_GATEWAY}${path}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/json',
      },
    })
    if (!res.ok) throw new Error(`FHIR ${res.status}: ${await res.text().catch(() => '')}`)
    return res.json()
  }

  private async fhirCompositionGet(path: string): Promise<FhirBundle> {
    const url = `${COMPOSITION_BASE}${path}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/json',
      },
    })
    if (!res.ok) throw new Error(`FHIR Composition ${res.status}: ${await res.text().catch(() => '')}`)
    return res.json()
  }

  async getPatient(cpf: string): Promise<{ id: string; name?: string; birthDate?: string; cpf?: string; cns?: string }> {
    const bundle = await this.fhirGet<FhirBundle>(`/Patient?identifier=http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf%7C${cpf}`)
    const patient = bundle.entry?.[0]?.resource as FhirPatient | undefined
    if (!patient) throw new Error('Paciente não encontrado no ConecteSUS')

    const getIdentValue = (systemSuffix: string) =>
      patient.identifier?.find(i => i.system.endsWith(systemSuffix))?.value

    return {
      id: patient.id,
      name: patient.name?.[0]?.text,
      birthDate: patient.birthDate,
      cpf: getIdentValue('/cpf'),
      cns: getIdentValue('/cns'),
    }
  }

  async getVaccines(patientId: string): Promise<ScrapedVaccine[]> {
    const bundle = await this.fhirGet<FhirBundle>(`/List?subject=Patient/${patientId}&code=http://www.saude.gov.br/fhir/r4/CodeSystem/BRClassificacaoLista%7Cimmunizations`)
    const list = bundle.entry?.[0]?.resource as FhirList | undefined
    if (!list?.entry) return []

    const vaccines: ScrapedVaccine[] = []

    for (const entry of list.entry) {
      const vaccineName = entry.flag?.coding?.[0]?.display || ''
      const applicationDate = entry.date ? entry.date.slice(0, 10) : ''
      const sourceId = entry.item.reference

      let dose = ''
      let batch = ''
      let appliedBy = ''
      let clinic = ''

      const compMatch = sourceId.match(/Composition\/([^/]+)/)
      if (compMatch) {
        const compositionId = compMatch[1]
        try {
          const docBundle = await this.fhirCompositionGet(`/Composition/${compositionId}`)
          if (docBundle.entry) {
            for (const docEntry of docBundle.entry) {
              const composition = docEntry.resource as FhirComposition
              if (composition.resourceType === 'Composition') {
                const section = composition.section?.[0]
                if (section?.text?.div) {
                  const text = section.text.div
                  const doseMatch = text.match(/(\d+)[ªa]?\s*(dose|Dose)/)
                  if (doseMatch) dose = `${doseMatch[1]}ª`
                  const batchMatch = text.match(/Lote[:\s]+([^\s<]+)/i)
                  if (batchMatch) batch = batchMatch[1]
                  const profMatch = text.match(/(?:Profissional|Aplicador)[:\s]+([^<\n]+)/i)
                  if (profMatch) appliedBy = profMatch[1].trim()
                  const localMatch = text.match(/(?:Local|Estabelecimento)[:\s]+([^<\n]+)/i)
                  if (localMatch) clinic = localMatch[1].trim()
                }
              }
            }
          }
        } catch {
          // Composition não disponível — segue com dados básicos
        }
      }

      vaccines.push({ vaccineName, dose, applicationDate, batch, appliedBy, clinic })
    }

    return vaccines
  }

  async getExams(patientId: string): Promise<ScrapedExam[]> {
    const bundle = await this.fhirGet<FhirBundle>(`/List?subject=Patient/${patientId}&code=http://www.saude.gov.br/fhir/r4/CodeSystem/BRClassificacaoLista%7Ctests`)
    const list = bundle.entry?.[0]?.resource as FhirList | undefined
    if (!list?.entry) return []

    return list.entry.map(e => ({
      examType: e.flag?.coding?.[0]?.display || '',
      examDate: e.date ? e.date.slice(0, 10) : '',
      results: e.item.display,
      description: e.flag?.coding?.[1]?.display,
    }))
  }

  async fetchAll(cpf: string, onProgress?: (p: ScraperProgress) => void): Promise<ScraperResult> {
    const emit = (step: string, message: string, status: ScraperProgress['status']) => onProgress?.({ step, message, status })

    emit('fetch-patient', 'Buscando dados do paciente...', 'running')
    const patient = await this.getPatient(cpf)
    emit('fetch-patient', `Paciente: ${patient.name}`, 'success')

    emit('fetch-vaccines', 'Buscando vacinas...', 'running')
    const vaccines = await this.getVaccines(patient.id)
    emit('fetch-vaccines', `${vaccines.length} vacinas encontradas`, 'success')

    emit('fetch-exams', 'Buscando exames...', 'running')
    const exams = await this.getExams(patient.id)
    emit('fetch-exams', `${exams.length} exames encontrados`, 'success')

    return { patientName: patient.name, patientBirthDate: patient.birthDate, patientCpf: patient.cpf, patientCns: patient.cns, vaccines, exams, prescriptions: [], rawPages: [] }
  }
}
