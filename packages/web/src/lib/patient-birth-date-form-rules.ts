import type { Rule } from 'antd/es/form'
import type { Dayjs } from 'dayjs'
import { getBirthDateValidationIssue } from './birth-date-validation.js'

function birthDateIssueMessage(
  issue: ReturnType<typeof getBirthDateValidationIssue>,
  t: (key: string) => string,
): string | null {
  if (!issue) return null
  if (issue === 'future') return t('patient.form.birthDateFuture')
  if (issue === 'too_old') return t('patient.form.birthDateTooOld')
  return t('patient.form.birthDateInvalid')
}

/** Regras Ant Design para `MaskedDatePicker` em criar/editar paciente (dashboard, ficha). */
export function patientBirthDateFormRules(t: (key: string) => string): Rule[] {
  return [
    { required: true, message: t('patient.form.birthDateRequired') },
    {
      validator: async (_, value: Dayjs | null | undefined) => {
        if (!value) {
          return Promise.reject(new Error(t('patient.form.birthDateRequired')))
        }
        if (typeof value.isValid === 'function' && !value.isValid()) {
          return Promise.reject(new Error(t('patient.form.birthDateInvalid')))
        }
        const date = value.toDate?.() ?? (value as unknown as Date)
        const message = birthDateIssueMessage(getBirthDateValidationIssue(date), t)
        return message ? Promise.reject(new Error(message)) : Promise.resolve()
      },
    },
  ]
}
