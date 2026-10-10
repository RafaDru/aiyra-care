import { describe, expect, it, vi } from 'vitest'
import dayjs from 'dayjs'
import { patientBirthDateFormRules } from '../src/lib/patient-birth-date-form-rules.js'

const t = vi.fn((key: string) => key)

async function runValidator(value: unknown) {
  const rules = patientBirthDateFormRules(t)
  const rule = rules[1] as { validator: (a: unknown, b: unknown) => Promise<void> }
  await rule.validator(undefined, value)
}

describe('patientBirthDateFormRules', () => {
  it('rejects missing value', async () => {
    await expect(runValidator(null)).rejects.toThrow('patient.form.birthDateRequired')
  })

  it('rejects future birth date', async () => {
    const future = dayjs().add(2, 'year')
    await expect(runValidator(future)).rejects.toThrow('patient.form.birthDateFuture')
  })

  it('accepts valid past date', async () => {
    await expect(runValidator(dayjs('1990-03-15'))).resolves.toBeUndefined()
  })
})
