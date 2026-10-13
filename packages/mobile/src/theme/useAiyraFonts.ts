import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter'

export function useAiyraFonts() {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  })
  return loaded
}

export const AIYRA_FONT_REGULAR = 'Inter_400Regular'
export const AIYRA_FONT_SEMIBOLD = 'Inter_600SemiBold'
export const AIYRA_FONT_BOLD = 'Inter_700Bold'
