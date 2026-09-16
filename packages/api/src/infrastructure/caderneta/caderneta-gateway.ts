import type {
  ScrapedClinicalRecord,
  ScrapedDevelopmentMilestone,
  ScrapedFamilyMember,
  ScrapedVaccine,
  ScrapedVaccineScheduleItem,
  ScraperResult,
} from '../../domain/scraper/scraper-types.js'
import type { ScraperProgress } from '../../domain/scraper/health-portal-scraper.js'
import type { GovBrTokenSession } from '../govbr/govbr-token-session.js'

const GERENCIADOR_BASE = 'https://gerenciador-superapp-api.saude.gov.br'
const LOGIN_URL =
  'https://sso.acesso.gov.br/authorize?response_type=code&client_id=conectesus-app.saude.gov.br&scope=openid+email+phone+profile+govbr_confiabilidades&redirect_uri=https://cadernetadacrianca.saude.gov.br/login&nonce=aiyracare-caderneta&state=aiyracare-caderneta'

type JsonRecord = Record<string, unknown>

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

function pickString(obj: JsonRecord, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return undefined
}

function pickNumber(obj: JsonRecord, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'number' && !Number.isNaN(v)) return v
    if (typeof v === 'string' && v.trim() && !Number.isNaN(Number(v))) return Number(v)
  }
  return undefined
}

function decodeJwtPayload(token: string): JsonRecord {
  const part = token.split('.')[1]
  if (!part) return {}
  try {
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    return JSON.parse(json) as JsonRecord
  } catch {
    return {}
  }
}

function doseNumberFromLabel(label?: string): number | undefined {
  if (!label) return undefined
  const m = label.match(/(\d+)/)
  return m ? Number.parseInt(m[1], 10) : undefined
}

function mapRndsImmunizationRow(row: JsonRecord, childCpf: string): {
  applied?: ScrapedVaccine
  schedule?: ScrapedVaccineScheduleItem
} {
  const code = pickString(row, ['fab', 'codigo', 'code', 'id']) ?? String(row.fab ?? '')
  const doseLabel = pickString(row, ['result', 'dose', 'tag', 'doseLabel'])
  const vaccineName =
    pickString(row, ['nomeImunobiologico', 'nome', 'name', 'display']) ??
    pickString(row, ['nomeComum', 'nomeVacina']) ??
  `Imunobiológico ${code}`

  const applicationDate = pickString(row, ['dataAplicacao', 'applicationDate', 'date', 'data'])
  const batch = pickString(row, ['lote', 'batch', 'batchNumber'])
  const appliedBy = pickString(row, ['profissional', 'appliedBy', 'aplicador'])
  const clinic = pickString(row, ['estabelecimento', 'clinic', 'local'])

  const externalKey = `${childCpf}:${code}:${doseLabel ?? 'dose'}`

  if (applicationDate) {
    return {
      applied: {
        vaccineName,
        dose: doseLabel ?? '',
        applicationDate: applicationDate.slice(0, 10),
        batch,
        appliedBy,
        clinic,
      },
      schedule: {
        vaccineCode: code,
        vaccineName,
        doseLabel,
        doseNumber: doseNumberFromLabel(doseLabel),
        status: 'applied',
        applicationDate: applicationDate.slice(0, 10),
        batch,
        appliedBy,
        clinic,
        externalKey,
        rawJson: row,
      },
    }
  }

  return {
    schedule: {
      vaccineCode: code,
      vaccineName,
      doseLabel,
      doseNumber: doseNumberFromLabel(doseLabel),
      status: 'unknown',
      externalKey,
      notes: pickString(row, ['atencao', 'attention', 'observacao']),
      rawJson: row,
    },
  }
}

export class CadernetaGateway {
  constructor(private readonly tokenSession: GovBrTokenSession) {}

  private browserConfig() {
    return {
      startUrl: LOGIN_URL,
      navigateMessage: 'Abrindo Caderneta da Criança (gov.br)...',
    }
  }

  async loginViaBrowser(onProgress?: (p: ScraperProgress) => void): Promise<string> {
    await this.tokenSession.ensureToken(onProgress, this.browserConfig())
    onProgress?.({ step: 'login', message: 'Login detectado! Coletando família e vacinas...', status: 'success' })
    return this.tokenSession.getAccessToken()
  }

  private async ensureToken(onProgress?: (p: ScraperProgress) => void): Promise<void> {
    await this.tokenSession.ensureToken(onProgress, this.browserConfig())
  }

  private childHeaders(childCpf: string): Record<string, string> {
    return {
      Authorization: `Bearer ${this.tokenSession.getAccessToken()}`,
      'Content-Type': 'application/json',
      'X-Cpf-crianca': childCpf.replace(/\D/g, ''),
    }
  }

  private async gerenciadorGet(path: string, childCpf?: string, onProgress?: (p: ScraperProgress) => void): Promise<unknown> {
    await this.ensureToken(onProgress)
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.tokenSession.getAccessToken()}`,
      Accept: 'application/json',
    }
    if (childCpf) headers['X-Cpf-crianca'] = childCpf.replace(/\D/g, '')

    const url = `${GERENCIADOR_BASE}${path}`
    const res = await fetch(url, { headers })
    if (res.status === 401) {
      this.tokenSession.clear()
      await this.ensureToken(onProgress)
      headers.Authorization = `Bearer ${this.tokenSession.getAccessToken()}`
      const retry = await fetch(url, { headers })
      if (!retry.ok) throw new Error(`Caderneta API ${retry.status}: ${await retry.text().catch(() => '')}`)
      return retry.json()
    }
    if (!res.ok) throw new Error(`Caderneta API ${res.status}: ${await res.text().catch(() => '')}`)
    return res.json()
  }

  getResponsibleCpf(): string | undefined {
    const token = this.tokenSession.getAccessToken()
    if (!token) return undefined
    const payload = decodeJwtPayload(token)
    const sub = typeof payload.sub === 'string' ? payload.sub.replace(/\D/g, '') : ''
    return sub.length === 11 ? sub : undefined
  }

  async getFamilyMembers(responsibleCpf: string, onProgress?: (p: ScraperProgress) => void): Promise<ScrapedFamilyMember[]> {
    const cpf = responsibleCpf.replace(/\D/g, '')
    const data = await this.gerenciadorGet(`/v1/dependente/responsavel/${cpf}`, undefined, onProgress)
    const rows = asArray<JsonRecord>(data)
    return rows.map((row) => ({
      id: pickString(row, ['id', 'idDependente', 'cns']),
      name: pickString(row, ['nome', 'name']),
      cpf: pickString(row, ['cpf'])?.replace(/\D/g, ''),
      cns: pickString(row, ['cns']),
      birthDate: pickString(row, ['dataNascimento', 'birthDate']),
      gender: pickString(row, ['genero', 'sexo', 'gender']),
    }))
  }

  async fetchChildData(child: ScrapedFamilyMember, onProgress?: (p: ScraperProgress) => void): Promise<{
    vaccines: ScrapedVaccine[]
    vaccineSchedule: ScrapedVaccineScheduleItem[]
    developmentMilestones: ScrapedDevelopmentMilestone[]
    clinicalHistory: ScrapedClinicalRecord[]
  }> {
    const childCpf = child.cpf?.replace(/\D/g, '')
    if (!childCpf) {
      return { vaccines: [], vaccineSchedule: [], developmentMilestones: [], clinicalHistory: [] }
    }

    const vaccines: ScrapedVaccine[] = []
    const vaccineSchedule: ScrapedVaccineScheduleItem[] = []
    const developmentMilestones: ScrapedDevelopmentMilestone[] = []
    const clinicalHistory: ScrapedClinicalRecord[] = []

    try {
      const imm = await this.gerenciadorGet('/v1/rnds/lista-imunobiologicos', childCpf, onProgress)
      const rows = asArray<JsonRecord>(imm)
      for (const row of rows) {
        const mapped = mapRndsImmunizationRow(row, childCpf)
        if (mapped.applied) vaccines.push(mapped.applied)
        if (mapped.schedule) vaccineSchedule.push(mapped.schedule)
      }
    } catch (err) {
      console.warn('[caderneta] lista-imunobiologicos', err instanceof Error ? err.message : err)
    }

    try {
      const marcos = await this.gerenciadorGet('/v1/rnds/marcos-desenvolvimento', childCpf, onProgress)
      for (const row of asArray<JsonRecord>(marcos)) {
        const title = pickString(row, ['marco', 'title', 'nome', 'descricao']) ?? 'Marco de desenvolvimento'
        developmentMilestones.push({
          title,
          category: pickString(row, ['categoria', 'category']),
          status: pickString(row, ['status', 'situacao'])?.toLowerCase().includes('ok') ? 'achieved' : 'unknown',
          expectedAgeMonths: pickNumber(row, ['idadeMeses', 'expectedAgeMonths', 'tempoAplicacao']),
          achievedDate: pickString(row, ['data', 'achievedDate', 'dataAlcance']),
          notes: pickString(row, ['observacao', 'notes']),
          externalKey: pickString(row, ['id', 'codigo', 'cns']),
        })
      }
    } catch (err) {
      console.warn('[caderneta] marcos-desenvolvimento', err instanceof Error ? err.message : err)
    }

    try {
      const hist = await this.gerenciadorGet('/v1/rnds/historico-clinico', childCpf, onProgress)
      for (const row of asArray<JsonRecord>(hist)) {
        clinicalHistory.push({
          title: pickString(row, ['titulo', 'title', 'tipo', 'procedimento']) ?? 'Registro clínico',
          date: pickString(row, ['data', 'date', 'dataAtendimento']),
          description: pickString(row, ['descricao', 'description', 'detalhe']),
          category: pickString(row, ['categoria', 'category']),
        })
      }
    } catch (err) {
      console.warn('[caderneta] historico-clinico', err instanceof Error ? err.message : err)
    }

    return { vaccines, vaccineSchedule, developmentMilestones, clinicalHistory }
  }

  async fetchAll(
    targetChildCpf?: string,
    onProgress?: (p: ScraperProgress) => void,
  ): Promise<ScraperResult> {
    const emit = (step: string, message: string, status: ScraperProgress['status']) =>
      onProgress?.({ step, message, status })

    await this.ensureToken(onProgress)
    const responsibleCpf = this.getResponsibleCpf()
    if (!responsibleCpf) throw new Error('Não foi possível identificar o CPF do responsável no token gov.br')

    emit('fetch-family', 'Buscando crianças vinculadas...', 'running')
    const familyMembers = await this.getFamilyMembers(responsibleCpf, onProgress)
    emit('fetch-family', `${familyMembers.length} dependente(s) na Minha Família`, 'success')

    const targetCpf = targetChildCpf?.replace(/\D/g, '')
    const children = targetCpf
      ? familyMembers.filter((c) => c.cpf?.replace(/\D/g, '') === targetCpf)
      : familyMembers

    if (children.length === 0) {
      throw new Error(
        targetCpf
          ? 'Criança não encontrada na Minha Família da Caderneta. Verifique o vínculo no portal.'
          : 'Nenhuma criança vinculada na Caderneta. Adicione em minha-familia no site do Ministério da Saúde.',
      )
    }

    const vaccines: ScrapedVaccine[] = []
    const vaccineSchedule: ScrapedVaccineScheduleItem[] = []
    const developmentMilestones: ScrapedDevelopmentMilestone[] = []
    const clinicalHistory: ScrapedClinicalRecord[] = []

    let primaryChild = children[0]
    const childBundles: import('../../domain/scraper/scraper-types.js').ScrapedChildImportBundle[] = []

    for (const child of children) {
      emit('fetch-child', `Coletando dados de ${child.name ?? child.cpf ?? 'criança'}...`, 'running')
      const data = await this.fetchChildData(child, onProgress)
      childBundles.push({
        member: child,
        vaccines: data.vaccines,
        vaccineSchedule: data.vaccineSchedule,
        developmentMilestones: data.developmentMilestones,
        clinicalHistory: data.clinicalHistory,
      })
      vaccines.push(...data.vaccines)
      vaccineSchedule.push(...data.vaccineSchedule)
      developmentMilestones.push(...data.developmentMilestones)
      clinicalHistory.push(...data.clinicalHistory)
      if (targetCpf && child.cpf?.replace(/\D/g, '') === targetCpf) primaryChild = child
      emit('fetch-child', `Dados de ${child.name ?? 'criança'} coletados`, 'success')
    }

    return {
      patientName: primaryChild.name,
      patientBirthDate: primaryChild.birthDate,
      patientCpf: primaryChild.cpf,
      patientCns: primaryChild.cns,
      vaccines,
      exams: [],
      prescriptions: [],
      rawPages: [],
      familyMembers,
      vaccineSchedule,
      developmentMilestones,
      clinicalHistory,
      responsibleCpf,
      sourcePortal: 'caderneta',
      childBundles,
    }
  }
}
