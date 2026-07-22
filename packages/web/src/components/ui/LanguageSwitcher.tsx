import { Select } from 'antd'
import { useTranslation } from 'react-i18next'
import { setLanguage } from '../../i18n/index.js'

const languages = [
  { value: 'pt-BR', label: 'PT' },
  { value: 'en', label: 'EN' },
]

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  return (
    <Select
      value={i18n.language}
      onChange={setLanguage}
      options={languages}
      size="small"
      style={{ width: 70 }}
      variant="borderless"
    />
  )
}
