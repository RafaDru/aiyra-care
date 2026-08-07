import { describe, expect, it } from 'vitest'
import { ProjectContextService } from '../src/application/project/project-context.service.js'
import { parseHistoricoMarkdown } from '../src/infrastructure/docs/historico.parser.js'

describe('ProjectContextService', () => {
  it('builds context with migrations and historico', () => {
    const ctx = new ProjectContextService().build()
    expect(ctx.schemaVersion).toBe(1)
    expect(ctx.migrations.length).toBeGreaterThan(10)
    expect(ctx.historico.sessionCount).toBeGreaterThan(0)
    expect(ctx.decisions.some((d) => d.id === 'postgres-source-of-truth')).toBe(true)
    expect(ctx.documentationSources.some((d) => d.path.includes('PROJETO.md'))).toBe(true)
  })
})

describe('parseHistoricoMarkdown', () => {
  it('parses session headers', () => {
    const sessions = parseHistoricoMarkdown(`
## [2026-08-06] - Test session
### Realizado
- [x] Something done
`)
    expect(sessions.length).toBe(1)
    expect(sessions[0].title).toBe('Test session')
    expect(sessions[0].sections[0].items[0].done).toBe(true)
  })
})
