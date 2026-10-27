import { describe, expect, it } from 'vitest'
import { formatCnpj, mergeLegalPublisher } from './legal-publisher.js'

describe('formatCnpj', () => {
  it('formats 14 digits', () => {
    expect(formatCnpj('12345678000199')).toBe('12.345.678/0001-99')
  })
})

describe('mergeLegalPublisher', () => {
  const env = { entityName: 'Env Co', cnpj: '12345678000199', complete: true }

  it('prefers complete API publisher', () => {
    const api = { entityName: 'API Co', cnpj: '98765432000111', complete: true }
    expect(mergeLegalPublisher(api, env).entityName).toBe('API Co')
  })

  it('falls back to env when API incomplete', () => {
    const api = { entityName: null, cnpj: null, complete: false }
    expect(mergeLegalPublisher(api, env).entityName).toBe('Env Co')
  })
})
