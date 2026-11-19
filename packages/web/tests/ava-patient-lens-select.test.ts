import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cssPath = resolve(root, 'src/components/ava/ava-patient-lens-select.css')
const tsxPath = resolve(root, 'src/components/ava/AvaPatientLensSelect.tsx')
const css = readFileSync(cssPath, 'utf8')
const tsx = readFileSync(tsxPath, 'utf8')

describe('ava-patient-lens-select.css', () => {
  it('keeps closed selector label + Você tag on one row', () => {
    expect(css).toContain('.ava-patient-lens-select .ant-select-selection-item')
    expect(css).toContain('flex-direction: row')
    expect(css).toContain('.ava-patient-lens-select .ant-select-content')
    expect(css).toContain('.ava-patient-lens-select--block')
  })

  it('styles dropdown without virtual-scroll gaps', () => {
    expect(css).toContain('.ava-patient-lens-select__popup')
    expect(tsx).toContain('virtual={false}')
    expect(tsx).toContain('popupClassName="ava-patient-lens-select__popup"')
  })
})
