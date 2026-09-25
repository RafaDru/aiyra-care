import { Image, StyleSheet, Text, View } from 'react-native'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

const LOGO_LIGHT = require('../../../assets/brand/logo-horizontal.png')
const LOGO_DARK = require('../../../assets/brand/logo-horizontal-dark.png')

type Props = {
  height?: number
}

export function AppLogo({ height = 40 }: Props) {
  const { dark } = useAiyraTheme()
  const source = dark ? LOGO_DARK : LOGO_LIGHT

  return (
    <Image
      source={source}
      accessibilityLabel="Aiyra Care"
      style={{ height, width: height * 3.85, maxWidth: '100%' }}
      resizeMode="contain"
    />
  )
}

/** Fallback textual — use só se assets ausentes em dev. */
export function AppLogoFallback({ height = 40 }: Props) {
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
