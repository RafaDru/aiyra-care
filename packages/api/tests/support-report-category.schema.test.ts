import { describe, expect, it } from 'vitest'
import { supportReportCategorySchema } from '../src/infrastructure/http/support-report/support-report.schema.js'
import { SUPPORT_REPORT_CATEGORIES } from '../src/domain/support-report/support-report.types.js'

describe('supportReportCategorySchema', () => {
  it('aceita todas as categorias do domínio', () => {
    for (const category of SUPPORT_REPORT_CATEGORIES) {
      expect(supportReportCategorySchema.safeParse(category).success).toBe(true)
    }
  })

  it('rejeita categoria desconhecida', () => {
    expect(supportReportCategorySchema.safeParse('billing').success).toBe(false)
  })
})
