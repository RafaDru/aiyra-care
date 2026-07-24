import type { Page } from 'playwright'
import type { GroqLlmAdapter } from '../../llm/groq-llm.adapter.js'

export type SectionTarget = 'vaccines' | 'exams' | 'prescriptions' | 'appointments'

export class NavAgent {
  constructor(private readonly llm: GroqLlmAdapter) {}

  async navigateTo(page: Page, target: SectionTarget): Promise<string | null> {
    const html = await page.content()

    const result = await this.llm.extractJson<{ found: boolean; selector: string; error?: string }>(
      `Você está analisando um portal de saúde brasileiro (SUS, operadora de plano).
       O usuário quer acessar a seção "${target}".
       Mapeamento de termos:
       - vaccines → vacinas, imunização, carteira de vacinação
       - exams → exames, resultados, laudos
       - prescriptions → receitas, medicamentos, remédios
       - appointments → consultas, atendimentos, agendamentos
       Analise o HTML e retorne o seletor CSS do link/botão/texto que leva a essa seção.
       Se não encontrar, retorne found: false e uma sugestão.`,
      html,
    )

    if (!result.found || !result.selector) {
      const allLinks = await page.$$eval('a', els =>
        els.map(e => ({ text: e.textContent?.trim(), href: e.getAttribute('href') || '' })).slice(0, 50),
      )
      return `Não encontrei a seção "${target}". Links disponíveis: ${JSON.stringify(allLinks)}`
    }

    try {
      await page.click(result.selector)
      await page.waitForTimeout(3000)
      return null
    } catch {
      return `Falha ao clicar no seletor: ${result.selector}`
    }
  }
}
