import { describe, it, expect } from 'vitest'
import { inferFleuryLabBrandId } from '../src/infrastructure/scraper/fleury-lab-brand-infer.ts'

describe('inferFleuryLabBrandId', () => {
  it('matches grupo Fleury marcas', () => {
    expect(inferFleuryLabBrandId('Labs a+ Rio')).toBe('labs_a')
    expect(inferFleuryLabBrandId('a+ SP')).toBe('a_mais')
    expect(inferFleuryLabBrandId('Hermes Pardini')).toBe('pardini')
    expect(inferFleuryLabBrandId('Fleury SP')).toBe('fleury')
  })

  it('returns null for empty', () => {
    expect(inferFleuryLabBrandId('')).toBeNull()
    expect(inferFleuryLabBrandId(null)).toBeNull()
  })
})
