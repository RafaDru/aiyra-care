import type { ScrapedVaccine, ScrapedExam, ScraperResult } from '../../domain/scraper/scraper-types.js'
import type { ScraperProgress } from '../../domain/scraper/health-portal-scraper.js'
import type { FhirBundle, FhirPatient, FhirList, FhirComposition } from './fhir-types.js'
import type { GovBrTokenSession } from '../govbr/govbr-token-session.js'

const FHIR_GATEWAY = 'https://ehr-search-gateway.saude.gov.br/api/fhir/r4'
const COMPOSITION_BASE = 'https://mg-ehr-services.saude.gov.br/1.15/api/fhir/r4'

export class ConecteSUSGateway {
  constructor(private readonly tokenSession: GovBrTokenSession) {}

  async loginViaBrowser(onProgress?: (p: ScraperProgress) => void): Promise<string> {
    await this.tokenSession.ensureToken(onProgress, {
      startUrl: 'https://meususdigital.saude.gov.br/login',
      navigateMessage: 'Abrindo Meu SUS Digital...',
      waitForGovBrButton: true,
    })
    return this.tokenSession.getAccessToken()
  }

  private async ensureToken(onProgress?: (p: ScraperProgress) => void): Promise<void> {
    await this.tokenSession.ensureToken(onProgress, {
      startUrl: 'https://meususdigital.saude.gov.br/login',
      navigateMessage: 'Abrindo Meu SUS Digital...',
      waitForGovBrButton: true,
    })
  }

  private async fhirGet<T>(path: string, onProgress?: (p: ScraperProgress) => void): Promise<T> {
    await this.ensureToken(onProgress)
    const url = `${FHIR_GATEWAY}${path}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.tokenSession.getAccessToken()}`,
        Accept: 'application/json',
      },
    })
    if (res.status === 401) {
      this.tokenSession.clear()
      await this.ensureToken(onProgress)
      const retry = await fetch(url, {
        headers: { Authorization: `Bearer ${this.tokenSession.getAccessToken()}`, Accept: 'application/json' },
      })
      if (!retry.ok) throw new Error(`FHIR ${retry.status} (após reautenticação): ${await retry.text().catch(() => '')}`)
      return retry.json()
    }
    if (!res.ok) throw new Error(`FHIR ${res.status}: ${await res.text().catch(() => '')}`)
    return res.json()
  }

  private async fhirCompositionGet(path: string, onProgress?: (p: ScraperProgress) => void): Promise<FhirBundle> {
    await this.ensureToken(onProgress)
    const url = `${COMPOSITION_BASE}${path}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.tokenSession.getAccessToken()}`,
        Accept: 'application/json',
      },
    })
    if (res.status === 401) {
      this.tokenSession.clear()
      await this.ensureToken(onProgress)
      const retry = await fetch(url, {
        headers: { Authorization: `Bearer ${this.tokenSession.getAccessToken()}`, Accept: 'application/json' },
      })
      if (!retry.ok) throw new Error(`FHIR Composition ${retry.status} (após reautenticação): ${await retry.text().catch(() => '')}`)
      return retry.json()
    }
    if (!res.ok) throw new Error(`FHIR Composition ${res.status}: ${await res.text().catch(() => '')}`)
    return res.json()
  }

  async getPatient(cpf: string, onProgress?: (p: ScraperProgress) => void): Promise<{ id: string; name?: string; birthDate?: string; cpf?: string; cns?: string }> {
    const bundle = await this.fhirGet<FhirBundle>(`/Patient?identifier=http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf%7C${cpf}`, onProgress)
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

  async getVaccines(patientId: string, onProgress?: (p: ScraperProgress) => void): Promise<ScrapedVaccine[]> {
    const bundle = await this.fhirGet<FhirBundle>(`/List?subject=Patient/${patientId}&code=http://www.saude.gov.br/fhir/r4/CodeSystem/BRClassificacaoLista%7Cimmunizations`, onProgress)
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
          const docBundle = await this.fhirCompositionGet(`/Composition/${compositionId}`, onProgress)
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

  async getExams(patientId: string, onProgress?: (p: ScraperProgress) => void): Promise<ScrapedExam[]> {
    const bundle = await this.fhirGet<FhirBundle>(`/List?subject=Patient/${patientId}&code=http://www.saude.gov.br/fhir/r4/CodeSystem/BRClassificacaoLista%7Ctests`, onProgress)
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
    const patient = await this.getPatient(cpf, onProgress)
    emit('fetch-patient', `Paciente: ${patient.name}`, 'success')

    emit('fetch-vaccines', 'Buscando vacinas...', 'running')
    const vaccines = await this.getVaccines(patient.id, onProgress)
    emit('fetch-vaccines', `${vaccines.length} vacinas encontradas`, 'success')

    emit('fetch-exams', 'Buscando exames...', 'running')
    const exams = await this.getExams(patient.id, onProgress)
    emit('fetch-exams', `${exams.length} exames encontrados`, 'success')

    return {
      patientName: patient.name,
      patientBirthDate: patient.birthDate,
      patientCpf: patient.cpf,
      patientCns: patient.cns,
      vaccines,
      exams,
      prescriptions: [],
      rawPages: [],
    }
  }
}
