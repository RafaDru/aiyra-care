import { describe, expect, it, beforeEach, vi } from 'vitest'
import type { Patient } from '../src/lib/api.types.js'

function createLocalStorageMock() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => store.clear(),
  }
}

const self: Patient = {
  id: 'self-1',
  name: 'Luis Titular',
  birthDate: '1990-01-01',
  isSelf: true,
  ageCategory: 'adults',
}

const child: Patient = {
  id: 'child-1',
  name: 'Joana Filha',
  birthDate: '2020-01-01',
  ageCategory: 'children',
}

describe('resolveAvaPatientLens', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock())
    vi.resetModules()
  })

  it('prefers route patient when set', async () => {
    const { resolveAvaPatientLens } = await import('../src/lib/ava-patient-lens.js')
    expect(resolveAvaPatientLens([self, child], child.id)).toBe(child.id)
  })

  it('prefers self on home when preferSelfOnHome is set', async () => {
    const { resolveAvaPatientLens, writeAvaLastPatientId } = await import('../src/lib/ava-patient-lens.js')
    writeAvaLastPatientId(child.id)
    expect(resolveAvaPatientLens([self, child], null, { preferSelfOnHome: true })).toBe(self.id)
  })

  it('uses last stored patient when not on home preference', async () => {
    const { resolveAvaPatientLens, writeAvaLastPatientId } = await import('../src/lib/ava-patient-lens.js')
    writeAvaLastPatientId(child.id)
    expect(resolveAvaPatientLens([self, child], null)).toBe(child.id)
  })
})
