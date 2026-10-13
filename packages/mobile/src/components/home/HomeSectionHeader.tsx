import { StyleSheet, Text, View } from 'react-native'
import type { AiyraThemeTokens } from '@/theme/useAiyraTheme'

type Props = {
  title: string
  count: number
  tokens: AiyraThemeTokens
}

export function HomeSectionHeader({ title, count, tokens }: Props) {
  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: tokens.colorTextBase }]}>{title}</Text>
      <View style={[styles.badge, { backgroundColor: tokens.colorBgLayout, borderColor: tokens.colorBorder }]}>
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 12, fontWeight: '700' }}>{count}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '700' },
  badge: {
    borderWidth: 1,
    borderRadius: 10,
    minWidth: 26,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignItems: 'center',
  },
})
