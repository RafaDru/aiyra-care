import AsyncStorage from '@react-native-async-storage/async-storage'
import * as LocalAuthentication from 'expo-local-authentication'

export const BIOMETRIC_UNLOCK_KEY = 'aiyracare.mobile.biometric-unlock'

export type BiometricSupport = {
  available: boolean
  enrolled: boolean
  label: string
}

export async function getBiometricSupport(): Promise<BiometricSupport> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync()
  if (!hasHardware) {
    return { available: false, enrolled: false, label: 'Biometria' }
  }
  const enrolled = await LocalAuthentication.isEnrolledAsync()
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
  const hasFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
  const hasFinger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
  const label = hasFace ? 'Face ID' : hasFinger ? 'Impressão digital' : 'Biometria'
  return { available: enrolled, enrolled, label }
}

export async function isBiometricUnlockEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(BIOMETRIC_UNLOCK_KEY)) === '1'
}

export async function setBiometricUnlockEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(BIOMETRIC_UNLOCK_KEY, enabled ? '1' : '0')
}

export async function authenticateWithBiometric(promptMessage: string): Promise<boolean> {
  const support = await getBiometricSupport()
  if (!support.available) return false
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
    fallbackLabel: 'Usar senha do dispositivo',
  })
  return result.success
}
