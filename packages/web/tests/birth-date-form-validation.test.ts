import { describe, expect, it, vi } from 'vitest'
import dayjs from 'dayjs'
import {
  isBirthDateDayjsValue,
  validateBirthDateField,
  PATIENT_FORM_BIRTH_DATE_MESSAGE_KEYS,
} from '../src/lib/birth-date-form-validation.js'

const t = vi.fn((key: string) => key)

describe('birth-date-form-validation', () => {
  it('rejects values without toDate', async () => {
    await expect(validateBirthDateField(null, t, PATIENT_FORM_BIRTH_DATE_MESSAGE_KEYS)).resolves.toBeUndefined()
    await expect(validateBirthDateField('15/03/1990', t, PATIENT_FORM_BIRTH_DATE_MESSAGE_KEYS)).rejects.toThrow(
      'patient.form.birthDateInvalid',
    )
  })

  it('rejects future birth dates', async () => {
    const future = dayjs().add(1, 'year')
    await expect(validateBirthDateField(future, t, PATIENT_FORM_BIRTH_DATE_MESSAGE_KEYS)).rejects.toThrow(
      'patient.form.birthDateFuture',
    )
  })

  it('accepts valid past dates', async () => {
    const past = dayjs('1990-03-15')
    await expect(validateBirthDateField(past, t, PATIENT_FORM_BIRTH_DATE_MESSAGE_KEYS)).resolves.toBeUndefined()
  })

  it('detects dayjs-like values', () => {
    expect(isBirthDateDayjsValue(dayjs())).toBe(true)
    expect(isBirthDateDayjsValue(null)).toBe(false)
  })
})
