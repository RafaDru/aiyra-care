import { describe, expect, it } from 'vitest'
import { isAvaTestModeEnabled } from '../src/domain/llm/ava-test-mode.js'

describe('ava-test-mode', () => {
  it('desligado por padrão', () => {
    const prev = process.env.AVA_TEST_MODE
    delete process.env.AVA_TEST_MODE
    expect(isAvaTestModeEnabled()).toBe(false)
    process.env.AVA_TEST_MODE = prev
  })

  it('liga com AVA_TEST_MODE=1', () => {
    const prev = process.env.AVA_TEST_MODE
    process.env.AVA_TEST_MODE = '1'
    expect(isAvaTestModeEnabled()).toBe(true)
    process.env.AVA_TEST_MODE = prev
  })
})
