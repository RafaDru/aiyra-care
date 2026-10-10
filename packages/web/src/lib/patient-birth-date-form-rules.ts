import type { Rule } from 'antd/es/form'
import {
  PATIENT_FORM_BIRTH_DATE_MESSAGE_KEYS,
  validateBirthDateField,
} from './birth-date-form-validation.js'

/** Regras Ant Design para `MaskedDatePicker` em criar/editar paciente (dashboard, ficha). */
export function patientBirthDateFormRules(t: (key: string) => string): Rule[] {
  return [
    { required: true, message: t('patient.form.birthDateRequired') },
    {
      validator: (_, value) => {
        if (!value) return Promise.reject(new Error(t('patient.form.birthDateRequired')))
        return validateBirthDateField(value, t, PATIENT_FORM_BIRTH_DATE_MESSAGE_KEYS)
      },
    },
  ]
}
