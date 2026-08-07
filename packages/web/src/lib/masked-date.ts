import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

export const MASKED_DATE_FORMAT = 'DD/MM/YYYY'
export const MASKED_DATE_PLACEHOLDER = 'DD/MM/YYYY'

/** Formata dígitos com barras automáticas (DD/MM/YYYY). */
export function formatDateMaskInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export function parseMaskedDate(text: string): dayjs.Dayjs | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const parsed = dayjs(trimmed, MASKED_DATE_FORMAT, true)
  return parsed.isValid() ? parsed : null
}

export function formatDayjsToMask(value: dayjs.Dayjs | null | undefined): string {
  if (!value || !value.isValid()) return ''
  return value.format(MASKED_DATE_FORMAT)
}
