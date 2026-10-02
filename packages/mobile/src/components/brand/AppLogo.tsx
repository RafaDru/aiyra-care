import { Image, StyleSheet, Text, View } from 'react-native'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export type AppLogoVariant = 'horizontal' | 'square'

const ASSETS: Record<AppLogoVariant, { light: number; dark: number; aspect: number }> = {
  horizontal: {
    light: require('../../../assets/brand/logo-horizontal.png'),
    dark: require('../../../assets/brand/logo-horizontal-dark.png'),
    aspect: 400 / 104,
  },
  square: {
    light: require('../../../assets/brand/logo-square.png'),
    dark: require('../../../assets/brand/logo-square-dark.png'),
    aspect: 1,
  },
}

const DEFAULT_HEIGHT: Record<AppLogoVariant, number> = {
  horizontal: 40,
  square: 120,
}

type Props = {
  variant?: AppLogoVariant
  height?: number
}

export function AppLogo({ variant = 'horizontal', height }: Props) {
  const { dark } = useAiyraTheme()
  const meta = ASSETS[variant]
  const source = dark ? meta.dark : meta.light
  const h = height ?? DEFAULT_HEIGHT[variant]

  return (
    <Image
      source={source}
      accessibilityLabel="Aiyra Care"
      style={{ height: h, width: h * meta.aspect, maxWidth: '100%' }}
      resizeMode="contain"
    />
  )
}

/** Fallback textual — use só se assets ausentes em dev. */
export function AppLogoFallback({ height = 40 }: { height?: number }) {
  const { tokens } = useAiyraTheme()
  return (
    <View style={styles.row} accessibilityLabel="Aiyra Care">
      <View
        style={[
          styles.icon,
          { height: height * 0.85, width: height * 0.85, backgroundColor: tokens.colorPrimary },
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
