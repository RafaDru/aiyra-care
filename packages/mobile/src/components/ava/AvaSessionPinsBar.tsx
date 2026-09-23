import { ScrollView, StyleSheet, Text, View } from 'react-native'
import type { AvaSessionPin } from '@/lib/api.types'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = { pins: AvaSessionPin[] }

export function AvaSessionPinsBar({ pins }: Props) {
  const { tokens } = useAiyraTheme()
  const active = pins.filter((p) => p.active)
  if (active.length === 0) return null

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {active.map((pin) => (
        <View
          key={pin.id}
          style={[styles.chip, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgLayout }]}
        >
          <Text style={{ color: tokens.colorTextSecondary, fontSize: 11 }} numberOfLines={1}>
            {pin.label ?? `${pin.entityType}`}
          </Text>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingBottom: 8 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, maxWidth: 160 },
})
