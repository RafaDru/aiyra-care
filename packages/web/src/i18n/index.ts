import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import ptBR from './locales/pt-BR.json' with { type: 'json' }
import en from './locales/en.json' with { type: 'json' }
import { syncDayjsLocale } from '../lib/dayjs-locale.js'

const saved = localStorage.getItem('aiyra-care-lang')
const initialLang = saved || 'pt-BR'
syncDayjsLocale(initialLang)

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { 'pt-BR': { translation: ptBR }, en: { translation: en } },
    lng: saved || 'pt-BR',
    fallbackLng: 'pt-BR',
    interpolation: { escapeValue: false },
  })

i18n.on('languageChanged', (lang) => {
  syncDayjsLocale(lang)
})

export function setLanguage(lang: string) {
  localStorage.setItem('aiyra-care-lang', lang)
  syncDayjsLocale(lang)
  void i18n.changeLanguage(lang)
}

export default i18n
