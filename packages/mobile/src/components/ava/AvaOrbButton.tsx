import { Image, Pressable, StyleSheet, View, type ViewStyle } from 'react-native'
import { DUAL_ENTRY_FAB_SHADOW } from '@/lib/dual-entry-layout'

const AVA_AVATAR = require('../../../assets/brand/ava-avatar.png')

type Props = {
  size: number
  onPress: () => void
  accessibilityLabel: string
  style?: ViewStyle
}

/** FAB Ava — orb com avatar (paridade `AvaDockWidget` / `ava-global-dock.css`). */
export function AvaOrbButton({ size, onPress, accessibilityLabel, style }: Props) {
  const ring = Math.round(size * 0.06)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[
        styles.wrap,
        DUAL_ENTRY_FAB_SHADOW,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          padding: ring,
        },
        style,
      ]}
    >
      <View style={[styles.glow, { borderRadius: size / 2 }]} />
      <Image
        source={AVA_AVATAR}
        accessibilityIgnoresInvertColors
        style={{ width: size - ring * 2, height: size - ring * 2, borderRadius: (size - ring * 2) / 2 }}
        resizeMode="cover"
      />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  glow: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
    borderColor: 'rgba(147, 51, 234, 0.35)',
  },
})
