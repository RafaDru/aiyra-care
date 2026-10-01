import { StyleSheet, Text, View, type ViewProps } from 'react-native'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = ViewProps & {
  title: string
  subtitle?: string
}

export function SectionCard({ title, subtitle, children, style, ...rest }: Props) {
  const { tokens } = useAiyraTheme()
  return (
    <View
      style={[styles.card, { backgroundColor: tokens.colorBgContainer, borderColor: tokens.colorBorder }, style]}
      {...rest}
    >
      <Text style={[styles.title, { color: tokens.colorTextBase }]}>{title}</Text>
      {subtitle ? <Text style={{ color: tokens.colorTextSecondary, marginBottom: 12 }}>{subtitle}</Text> : null}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
})
