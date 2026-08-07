import { useEffect, useRef, useState } from 'react'
import { AutoComplete } from 'antd'
import type { AutoCompleteProps } from 'antd'
import { api } from '../../lib/api.js'

type Props = Omit<AutoCompleteProps, 'options' | 'onSearch' | 'filterOption'> & {
  onChange?: (value: string) => void
}

export function CarePlaceAutocomplete({ value, onChange, placeholder, ...rest }: Props) {
  const [options, setOptions] = useState<Array<{ value: string }>>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadOptions = async (q: string) => {
    try {
      const items = await api.carePlaces.search(q)
      setOptions(items.map((item) => ({ value: item.displayName })))
    } catch {
      setOptions([])
    }
  }

  useEffect(() => {
    void loadOptions('')
  }, [])

  const handleSearch = (q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => void loadOptions(q), 200)
  }

  return (
    <AutoComplete
      {...rest}
      value={value}
      onChange={onChange}
      options={options}
      onSearch={handleSearch}
      placeholder={placeholder}
      filterOption={false}
      allowClear
    />
  )
}
