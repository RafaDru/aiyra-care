import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Localization from 'expo-localization'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import ptBR from './locales/pt-BR.json'
import en from './locales/en.json'

export const LANGUAGE_STORAGE_KEY = 'aiyra-care-lang'

export type AppLanguage = 'pt-BR' | 'en'

const resources = {
  'pt-BR': { translation: ptBR },
  en: { translation: en },
}

function deviceDefaultLanguage(): AppLanguage {
  const locales = Localization.getLocales()
  const tag = locales[0]?.languageTag ?? 'pt-BR'
  if (tag.toLowerCase().startsWith('en')) return 'en'
  return 'pt-BR'
}

let initPromise: Promise<void> | null = null

export function initI18n(): Promise<void> {
  if (initPromise) return initPromise
  initPromise = (async () => {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
    const lng: AppLanguage =
      saved === 'en' || saved === 'pt-BR' ? saved : deviceDefaultLanguage()

    if (!i18n.isInitialized) {
      await i18n.use(initReactI18next).init({
        resources,
        lng,
        fallbackLng: 'pt-BR',
        interpolation: { escapeValue: false },
        compatibilityJSON: 'v4',
      })
    } else {
      await i18n.changeLanguage(lng)
    }
  })()
  return initPromise
}

export async function setAppLanguage(lang: AppLanguage): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
  await i18n.changeLanguage(lang)
}

export default i18n
