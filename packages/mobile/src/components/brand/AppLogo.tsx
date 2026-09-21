import { Image, Platform, StyleSheet, Text, View } from 'react-native'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

const WEB_BRAND = {
  light: '/brand/logo-horizontal.svg',
  dark: '/brand/logo-horizontal-dark.svg',
} as const

type Props = {
  height?: number
}

/**
 * Marca horizontal alinhada ao web (`AppLogo` variant horizontal).
 * Web: SVG servido pelo Vite em `EXPO_PUBLIC_WEB_APP_URL`.
 * Nativo: ícone gradiente + wordmark até assets PNG dedicados no bundle.
 */
export function AppLogo({ height = 40 }: Props) {
  const { dark, tokens } = useAiyraTheme()
  const webBase = process.env.EXPO_PUBLIC_WEB_APP_URL?.replace(/\/$/, '')

  if (Platform.OS === 'web' && webBase) {
    const uri = `${webBase}${dark ? WEB_BRAND.dark : WEB_BRAND.light}`
    return (
      <Image
        source={{ uri }}
        accessibilityLabel="Aiyra Care"
        style={{ height, width: height * 3.85, maxWidth: '100%' }}
        resizeMode="contain"
      />
    )
  }

  return (
    <View style={styles.row} accessibilityLabel="Aiyra Care">
      <View
        style={[
          styles.icon,
          {
            height: height * 0.85,
            width: height * 0.85,
            backgroundColor: tokens.colorPrimary,
          },
        ]}
      />
      <Text style={[styles.wordmark, { color: tokens.colorTextBase, fontSize: height * 0.55 }]}>
        Aiyra Care
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  icon: { borderRadius: 10 },
  wordmark: { fontWeight: '700', letterSpacing: -0.5 },
})
