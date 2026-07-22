import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import ptBR from './locales/pt-BR.json' with { type: 'json' }
import en from './locales/en.json' with { type: 'json' }

const saved = localStorage.getItem('openhealth-lang')

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { 'pt-BR': { translation: ptBR }, en: { translation: en } },
    lng: saved || 'pt-BR',
    fallbackLng: 'pt-BR',
    interpolation: { escapeValue: false },
  })

export function setLanguage(lang: string) {
  localStorage.setItem('openhealth-lang', lang)
  void i18n.changeLanguage(lang)
}

export default i18n
