import type { Page } from 'playwright'
import type { GroqLlmAdapter } from '../../llm/groq-llm.adapter.js'
import type { ScrapedVaccine, ScrapedExam, ScrapedPrescription } from '../../../domain/scraper/scraper-types.js'

export class ExtractAgent {
  constructor(private readonly llm: GroqLlmAdapter) {}

  async extractVaccines(page: Page): Promise<ScrapedVaccine[]> {
    const html = await page.content()
    return this.llm.extractJson<ScrapedVaccine[]>(
      `Extraia TODOS os registros de vacinação desta página HTML de portal de saúde brasileiro.
       Para cada vacina, retorne: vaccineName, dose, applicationDate, nextDoseDate (opcional), batch (opcional), appliedBy (opcional), clinic (opcional).
       Retorne array vazio se não encontrar.`,
      html,
    )
  }

  async extractExams(page: Page): Promise<ScrapedExam[]> {
    const html = await page.content()
    return this.llm.extractJson<ScrapedExam[]>(
      `Extraia TODOS os exames desta página HTML de portal de saúde.
       Para cada exame, retorne: examType, examDate, description (opcional), attachedFiles (número opcional), results (opcional).
       Retorne array vazio se não encontrar.`,
      html,
    )
  }

  async extractPrescriptions(page: Page): Promise<ScrapedPrescription[]> {
    const html = await page.content()
    return this.llm.extractJson<ScrapedPrescription[]>(
      `Extraia TODAS as receitas/medicamentos desta página HTML de portal de saúde.
       Para cada, retorne: medicationName, dosage (opcional), duration (opcional), doctorName (opcional), prescriptionDate.
       Retorne array vazio se não encontrar.`,
      html,
    )
  }

  async extractPatientName(page: Page): Promise<string | undefined> {
    const html = await page.content()
    const result = await this.llm.extractJson<{ name?: string }>(
      `Extraia o nome do paciente/logado nesta página de portal de saúde.
       Procure por nome no cabeçalho, sidebar, ou área do perfil.
       Retorne { name: "Nome Completo" } ou { name: null } se não achar.`,
      html,
    )
    return result.name || undefined
  }
}
