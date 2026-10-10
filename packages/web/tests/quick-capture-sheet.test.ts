import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

describe('QuickCaptureSheet patient lens', () => {
  it('uses block AvaPatientLensSelect and drawer flex guard CSS', () => {
    const tsx = readFileSync(resolve(root, 'src/components/quick-capture/QuickCaptureSheet.tsx'), 'utf8')
    expect(tsx).toMatch(/<AvaPatientLensSelect[\s\S]*?\bblock\b/)
    expect(tsx).toContain('quick-capture-sheet__patient')

    const css = readFileSync(resolve(root, 'src/components/quick-capture/quick-capture-sheet.css'), 'utf8')
    expect(css).toContain('align-self: flex-start')
    expect(css).toContain('.ava-patient-lens-select')
  })
})
