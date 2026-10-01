import { describe, expect, it } from 'vitest'
import {
  buildBrowserMatchNeedles,
  parseLocalServiceUrl,
} from '../../../scripts/ops-notifier-browser-match.mjs'

describe('ops-notifier-browser-match', () => {
  it('parses ops console dev URL', () => {
    const parsed = parseLocalServiceUrl('http://127.0.0.1:3013/?tab=issues')
    expect(parsed).toEqual({ host: '127.0.0.1', port: 3013, isOpsConsole: true })
  })

  it('parses preview ops console', () => {
    const parsed = parseLocalServiceUrl('http://127.0.0.1:3023')
    expect(parsed?.isOpsConsole).toBe(true)
    expect(parsed?.port).toBe(3023)
  })

  it('ignores non-local hosts', () => {
    expect(parseLocalServiceUrl('https://ops.example.com')).toBeNull()
  })

  it('adds Observabilidade title needle for ops console', () => {
    const needles = buildBrowserMatchNeedles('http://127.0.0.1:3013')
    expect(needles.titleNeedles).toContain('Observabilidade')
    expect(needles.commandNeedles.some((n) => n.includes('3013'))).toBe(true)
  })

  it('does not add Observabilidade for web dev port', () => {
    const needles = buildBrowserMatchNeedles('http://localhost:5173')
    expect(needles.isOpsConsole).toBe(false)
    expect(needles.titleNeedles).not.toContain('Observabilidade')
  })
})
