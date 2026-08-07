import { useEffect, useState } from 'react'
import { Input } from 'antd'
import type { InputProps } from 'antd'
import type { Dayjs } from 'dayjs'
import {
  formatDateMaskInput,
  formatDayjsToMask,
  MASKED_DATE_PLACEHOLDER,
  parseMaskedDate,
} from '../../lib/masked-date.js'

type Props = Omit<InputProps, 'value' | 'onChange'> & {
  value?: Dayjs | null
  onChange?: (value: Dayjs | null) => void
}

export function MaskedDatePicker({ value, onChange, placeholder, ...rest }: Props) {
  const [text, setText] = useState(() => formatDayjsToMask(value))

  useEffect(() => {
    setText(formatDayjsToMask(value))
  }, [value])

  const commit = (masked: string) => {
    if (!masked) {
      onChange?.(null)
      return
    }
    if (masked.length === 10) {
      const parsed = parseMaskedDate(masked)
      onChange?.(parsed)
      if (!parsed) setText(formatDayjsToMask(value))
      return
    }
    if (masked.length < 10) onChange?.(null)
  }

  return (
    <Input
      {...rest}
      value={text}
      placeholder={placeholder ?? MASKED_DATE_PLACEHOLDER}
      maxLength={10}
      inputMode="numeric"
      onChange={(e) => {
        const masked = formatDateMaskInput(e.target.value)
        setText(masked)
        if (masked.length === 10 || masked.length === 0) commit(masked)
      }}
      onBlur={() => {
        if (!text) {
          onChange?.(null)
          return
        }
        if (text.length < 10) {
          setText(formatDayjsToMask(value))
          return
        }
        const parsed = parseMaskedDate(text)
        if (!parsed) setText(formatDayjsToMask(value))
        else onChange?.(parsed)
      }}
    />
  )
}
