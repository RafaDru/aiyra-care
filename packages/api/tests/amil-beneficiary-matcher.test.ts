import { describe, it, expect } from 'vitest'
import {
  buildHouseholdCandidates,
  matchAmilBeneficiaryToPatient,
  namesMatch,
  birthDatesMatch,
  type MatchablePatient,
} from '../src/application/insurance-plan/amil-beneficiary-matcher.js'

const holder: MatchablePatient = {
  id: 'holder-id',
  name: 'Rafael Drummond Ferreira Reis',
  cpf: '06376236650',
  cns: '704109069161350',
  birthDate: new Date('1984-04-05'),
  parentIds: [],
}

const luis: MatchablePatient = {
  id: 'luis-id',
  name: 'Luis Drummond Freitas Reis',
  cpf: '18245784664',
  cns: null,
  birthDate: new Date('2020-01-22'),
  parentIds: ['holder-id'],
}

const bruno: MatchablePatient = {
  id: 'bruno-id',
  name: 'Bruno Drummond Freitas Reis',
  cpf: '19358998644',
  cns: null,
  birthDate: new Date('2022-10-25'),
  parentIds: ['holder-id'],
}

const all = [holder, luis, bruno]
const household = buildHouseholdCandidates(holder.id, all)

describe('amil-beneficiary-matcher', () => {
  it('builds household from holder and children', () => {
    expect(household.map((p) => p.id)).toEqual(['holder-id', 'luis-id', 'bruno-id'])
  })

  it('matches by CPF', () => {
    const match = matchAmilBeneficiaryToPatient(
      { name: 'LUIS DRUMMOND FREITAS REIS', marcaOtica: '094995658', cpf: '18245784664', role: 'dependent' },
      holder.id,
      household,
      all,
    )
    expect(match?.id).toBe('luis-id')
  })

  it('matches holder by role', () => {
    const match = matchAmilBeneficiaryToPatient(
      { name: 'RAFAEL DRUMMOND FERREIRA REIS', marcaOtica: '094995656', role: 'holder' },
      holder.id,
      household,
      all,
    )
    expect(match?.id).toBe('holder-id')
  })

  it('does not false-match spouse by shared surnames', () => {
    const match = matchAmilBeneficiaryToPatient(
      {
        name: 'JENIFER CRISTINE FREITAS DRUMMOND',
        marcaOtica: '095006517',
        cpf: '38818409824',
        birthDate: '1990-10-13',
        role: 'dependent',
      },
      holder.id,
      household,
      all,
    )
    expect(match).toBeNull()
  })

  it('namesMatch handles token order', () => {
    expect(namesMatch(
      'LUIS DRUMMOND FREITAS REIS',
      'LUIS DRUMMOND FREITAS REIS',
    )).toBe(true)
    expect(namesMatch(
      'LUIS DRUMMOND FREITAS REIS',
      normalizeName('Luis Drummond Freitas Reis'),
    )).toBe(true)
  })

  it('birthDatesMatch allows 1 day tolerance', () => {
    expect(birthDatesMatch(new Date('2020-01-22'), new Date('2020-01-23'))).toBe(true)
    expect(birthDatesMatch(new Date('2020-01-22'), new Date('2020-01-25'))).toBe(false)
  })
})

function normalizeName(name: string) {
  return name.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/\s+/g, ' ').trim()
}
