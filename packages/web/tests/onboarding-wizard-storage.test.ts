import { describe, it, expect, beforeEach, vi } from 'vitest'

function createStorageMock() {
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

describe('onboarding-wizard-storage', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {})
    vi.stubGlobal('sessionStorage', createStorageMock())
    vi.stubGlobal('localStorage', createStorageMock())
    vi.resetModules()
  })

  it('tracks families step in sessionStorage', async () => {
    const mod = await import('../src/lib/onboarding-wizard-storage.js')
    expect(mod.readOnboardingWizardStep()).toBe(0)
    expect(mod.isOnboardingFamiliesStepActive()).toBe(false)
    mod.persistOnboardingFamiliesStep()
    expect(mod.readOnboardingWizardStep()).toBe(1)
    expect(mod.isOnboardingFamiliesStepActive()).toBe(true)
    mod.clearOnboardingWizardStep()
    expect(mod.readOnboardingWizardStep()).toBe(0)
  })

  it('persists family sub-wizard state', async () => {
    const mod = await import('../src/lib/onboarding-wizard-storage.js')
    mod.persistOnboardingFamilyWizard({
      phase: 'members',
      circleIndex: 1,
      activeCircleId: 'circle-1',
      circleNames: ['Minha família', 'Família 2'],
    })
    const read = mod.readOnboardingFamilyWizard()
    expect(read?.phase).toBe('members')
    expect(read?.circleIndex).toBe(1)
    expect(read?.activeCircleId).toBe('circle-1')
    expect(read?.circleNames).toEqual(['Minha família', 'Família 2'])
    mod.clearOnboardingWizardStep()
    expect(mod.readOnboardingFamilyWizard()).toBeNull()
  })

  it('suggests default circle names', async () => {
    const mod = await import('../src/lib/onboarding-wizard-storage.js')
    expect(mod.defaultFamilyCircleName('Maria Silva Santos', 0, [])).toBe('Família Santos')
    expect(mod.defaultFamilyCircleName('Maria', 0, [])).toBe('Minha família')
    expect(mod.defaultFamilyCircleName('Maria', 1, ['Família 2'])).toBe('Família 3')
  })

  it('tracks just-completed until cleared', async () => {
    const mod = await import('../src/lib/onboarding-wizard-storage.js')
    expect(mod.isOnboardingJustCompleted()).toBe(false)
    mod.markOnboardingJustCompleted()
    expect(mod.isOnboardingJustCompleted()).toBe(true)
    mod.clearOnboardingJustCompleted()
    expect(mod.isOnboardingJustCompleted()).toBe(false)
  })

  it('clears stale first-visit tour completed on markOnboardingJustCompleted', async () => {
    const tour = await import('../src/lib/first-visit-tour-storage.js')
    tour.markFirstVisitTourCompleted()
    expect(tour.isFirstVisitTourCompleted()).toBe(true)
    const mod = await import('../src/lib/onboarding-wizard-storage.js')
    mod.markOnboardingJustCompleted()
    expect(tour.isFirstVisitTourCompleted()).toBe(false)
  })

  it('consumes just-completed flag once (legacy)', async () => {
    const mod = await import('../src/lib/onboarding-wizard-storage.js')
    expect(mod.consumeOnboardingJustCompleted()).toBe(false)
    mod.markOnboardingJustCompleted()
    expect(mod.consumeOnboardingJustCompleted()).toBe(true)
    expect(mod.consumeOnboardingJustCompleted()).toBe(false)
  })
})
