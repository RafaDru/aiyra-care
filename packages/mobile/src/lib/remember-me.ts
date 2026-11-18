import AsyncStorage from '@react-native-async-storage/async-storage'

import {
  LAST_EMAIL_KEY,
  REMEMBER_ME_KEY,
  readLastEmail,
  readRememberMeRaw,
  removeLastEmail,
  writeLastEmail,
  writeRememberMeRaw,
} from './ananeri-storage-keys'

export { LAST_EMAIL_KEY, REMEMBER_ME_KEY }

const memoryAuth = new Map<string, string>()

const volatileAuthStorage = {
  getItem(key: string): string | null {
    return memoryAuth.get(key) ?? null
  },
  setItem(key: string, value: string): void {
    memoryAuth.set(key, value)
  },
  removeItem(key: string): void {
    memoryAuth.delete(key)
  },
}

export async function isRememberMeEnabled(): Promise<boolean> {
  const raw = await readRememberMeRaw()
  return raw !== '0'
}

export async function setRememberMePreference(remember: boolean): Promise<void> {
  await writeRememberMeRaw(remember ? '1' : '0')
}

/** AsyncStorage quando “manter conectado”; só memória quando desligado (perde ao fechar o app). */
export const hybridAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    const remember = await isRememberMeEnabled()
    if (remember) {
      const persisted = await AsyncStorage.getItem(key)
      if (persisted != null) return persisted
      return volatileAuthStorage.getItem(key)
    }
    return volatileAuthStorage.getItem(key)
  },
  async setItem(key: string, value: string): Promise<void> {
    const remember = await isRememberMeEnabled()
    if (remember) {
      await AsyncStorage.setItem(key, value)
      volatileAuthStorage.removeItem(key)
    } else {
      volatileAuthStorage.setItem(key, value)
      await AsyncStorage.removeItem(key)
    }
  },
  async removeItem(key: string): Promise<void> {
    volatileAuthStorage.removeItem(key)
    await AsyncStorage.removeItem(key)
  },
}

export async function loadLastEmail(): Promise<string | null> {
  const remember = await isRememberMeEnabled()
  if (!remember) return null
  return readLastEmail()
}

export async function saveLastEmail(email: string): Promise<void> {
  const remember = await isRememberMeEnabled()
  if (!remember) {
    await removeLastEmail()
    return
  }
  await writeLastEmail(email.trim())
}
