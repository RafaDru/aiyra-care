import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'aiyracare.mobile.session_id'

let cached: string | null = null

export async function getMobileSessionId(): Promise<string> {
  if (cached) return cached
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY)
    if (existing) {
      cached = existing
      return existing
    }
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.slice(0, 32)
    await AsyncStorage.setItem(STORAGE_KEY, id)
    cached = id
    return id
  } catch {
    return 'mobile'
  }
}
