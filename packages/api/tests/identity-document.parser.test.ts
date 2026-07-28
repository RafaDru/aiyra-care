import { describe, it, expect } from 'vitest'
import {
  isValidCpf,
  parseIdentityDocument,
  repairCpf,
} from '../src/domain/document/identity-document.parser.js'

describe('identity-document.parser', () => {
  it('validates CPF check digits', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true)
    expect(isValidCpf('182.457.846-64')).toBe(true)
    expect(isValidCpf('193.589.986-44')).toBe(true)
    expect(isValidCpf('11111111111')).toBe(false)
  })

  it('repairs OCR digit confusion when check digits fail', () => {
    // 646 variant is invalid; swapping one digit can recover a valid CPF
    expect(isValidCpf('18245764664')).toBe(false)
    const repaired = repairCpf('182.457.646-64')
    expect(repaired).toBeTruthy()
    expect(isValidCpf(repaired!)).toBe(true)
  })

  it('parses certidão layout from Vision-like OCR (Luís)', () => {
    const text = `
CERTIDÃO DE NASCIMENTO
NOME
Luis Drummond Freitas Reis
CPF
182.457.846-64
DATA DE NASCIMENTO POR EXTENSO
vinte e três de janeiro de dois mil e vinte
FILIAÇÃO
Rafael Drummond Ferreira Reis
Jenifer Cristine Freitas Drummond
DIA MES ANO
23/01/2020
SEXO
MASCULINO
`
    const parsed = parseIdentityDocument(text, 'certidao_nascimento')
    expect(parsed.cpf).toBe('18245784664')
    expect(parsed.birthDate).toBe('2020-01-23')
    expect(parsed.name?.toLowerCase()).toContain('luis')
    expect(parsed.fatherName?.toLowerCase()).toContain('rafael')
    expect(parsed.motherName?.toLowerCase()).toContain('jenifer')
    expect(parsed.sex).toBe('male')
  })

  it('parses Bruno certidão with CPF before NOME', () => {
    const text = `
CERTIDÃO DE NASCIMENTO
CPF
193.589.986-44
NOME
Bruno Drummond Freitas Reis
DIA MÊS ANO
26/10/2022
FILIAÇÃO
Rafael Drummond Ferreira Reis, Natural de: Belo Horizonte, MG
Jenifer Cristine Freitas Drummond, Natural de: São José dos Campos, SP
`
    const parsed = parseIdentityDocument(text, 'certidao_nascimento')
    expect(parsed.cpf).toBe('19358998644')
    expect(parsed.birthDate).toBe('2022-10-26')
    expect(parsed.name?.toLowerCase()).toContain('bruno')
    expect(parsed.motherName?.toLowerCase()).toContain('jenifer')
  })

  it('does not pick Corregedoria as name', () => {
    const text = `
CORREGEDORIA GERAL DE JUSTIÇA
CERTIDÃO DE NASCIMENTO
NOME
Luis Drummond Freitas Reis
CPF
182.457.846-64
`
    const parsed = parseIdentityDocument(text, 'certidao_nascimento')
    expect(parsed.name?.toLowerCase()).toContain('luis')
    expect(parsed.name?.toLowerCase()).not.toContain('corregedoria')
  })
})
