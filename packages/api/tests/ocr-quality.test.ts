import { describe, it, expect } from 'vitest'
import { scoreOcrText, LOCAL_OCR_MIN_SCORE } from '../src/domain/document/ocr-quality.js'
import { isLocalOcrSufficient, evaluateIdentityParse } from '../src/application/document/ocr-quality.js'

describe('ocr-quality', () => {
  it('scores certidão-like text higher than garbage', () => {
    const good = `CERTIDÃO DE NASCIMENTO\nNOME\nLuis Drummond\nCPF\n182.457.846-64\nDIA MES ANO\n23/01/2020`
    const bad = `) . / # $ % @@@ !!! ###`
    expect(scoreOcrText(good)).toBeGreaterThan(LOCAL_OCR_MIN_SCORE)
    expect(scoreOcrText(bad)).toBeLessThan(LOCAL_OCR_MIN_SCORE)
  })

  it('local OCR is sufficient when CPF parses', () => {
    const text = `CERTIDÃO DE NASCIMENTO\nNOME\nLuis Drummond Freitas Reis\nCPF\n182.457.846-64\nDIA MES ANO\n23/01/2020`
    expect(isLocalOcrSufficient('certidao_nascimento', text)).toBe(true)
    expect(evaluateIdentityParse('certidao_nascimento', text).metrics.parseOk).toBe(true)
  })

  it('local OCR is insufficient without CPF', () => {
    const text = `CERTIDÃO DE NASCIMENTO\nNOME\nLuis Drummond Freitas Reis\nDIA MES ANO\n23/01/2020`
    expect(isLocalOcrSufficient('certidao_nascimento', text)).toBe(false)
  })

  it('accepts clinical handwriting text without identity labels', () => {
    const text = Array(40).fill('Amoxicilina 500mg 1 cp 8/8h por 7 dias').join('\n')
    expect(isLocalOcrSufficient('prescription', text)).toBe(true)
  })

  it('rejects tiny clinical OCR', () => {
    expect(isLocalOcrSufficient('prescription', 'abc')).toBe(false)
  })
})
