import { describe, it, expect, beforeEach, vi } from 'vitest'

function createSessionStorageMock() {
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
    vi.stubGlobal('sessionStorage', createSessionStorageMock())
    vi.resetModules()
  })

  it('tracks dependents step in sessionStorage', async () => {
    const mod = await import('../src/lib/onboarding-wizard-storage.js')
    expect(mod.readOnboardingWizardStep()).toBe(0)
    expect(mod.isOnboardingDependentsStepActive()).toBe(false)
    mod.persistOnboardingDependentsStep()
    expect(mod.readOnboardingWizardStep()).toBe(1)
    expect(mod.isOnboardingDependentsStepActive()).toBe(true)
    mod.clearOnboardingWizardStep()
    expect(mod.readOnboardingWizardStep()).toBe(0)
  })

  it('tracks just-completed until cleared', async () => {
    const mod = await import('../src/lib/onboarding-wizard-storage.js')
    expect(mod.isOnboardingJustCompleted()).toBe(false)
    mod.markOnboardingJustCompleted()
    expect(mod.isOnboardingJustCompleted()).toBe(true)
    mod.clearOnboardingJustCompleted()
    expect(mod.isOnboardingJustCompleted()).toBe(false)
  })

  it('consumes just-completed flag once (legacy)', async () => {
    const mod = await import('../src/lib/onboarding-wizard-storage.js')
    expect(mod.consumeOnboardingJustCompleted()).toBe(false)
    mod.markOnboardingJustCompleted()
    expect(mod.consumeOnboardingJustCompleted()).toBe(true)
    expect(mod.consumeOnboardingJustCompleted()).toBe(false)
  })
})
