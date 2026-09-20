import { View, Text, StyleSheet } from 'react-native'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = {
  title: string
  subtitle?: string
  note?: string
}

export function PlaceholderTab({ title, subtitle, note }: Props) {
  const { tokens } = useAiyraTheme()
  return (
    <View style={[styles.box, { backgroundColor: tokens.colorBgContainer, borderColor: tokens.colorBorder }]}>
      <Text style={[styles.title, { color: tokens.colorTextBase }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: tokens.colorTextSecondary }]}>{subtitle}</Text>
      ) : null}
      {note ? <Text style={[styles.note, { color: tokens.colorPrimary }]}>{note}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  title: { fontSize: 18, fontWeight: '600' },
  subtitle: { fontSize: 14, lineHeight: 20 },
  note: { fontSize: 13, fontStyle: 'italic' },
})
