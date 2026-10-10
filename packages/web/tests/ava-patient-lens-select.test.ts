import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const cssPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../src/components/ava/ava-patient-lens-select.css',
)
const css = readFileSync(cssPath, 'utf8')

describe('ava-patient-lens-select.css', () => {
  it('keeps closed selector label + Você tag on one row', () => {
    expect(css).toContain('.ava-patient-lens-select .ant-select-selection-item')
    expect(css).toContain('flex-direction: row')
    expect(css).toContain('.ava-patient-lens-select .ant-select-content')
    expect(css).toContain('.ava-patient-lens-select--block')
  })
})
