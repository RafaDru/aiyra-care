import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import type { AiyraThemeTokens } from '@/theme/useAiyraTheme'

type Props = {
  tokens: AiyraThemeTokens
  loading?: boolean
  error?: string | null
  emptyMessage?: string
  onRetry?: () => void
}

export function StatePanel({ tokens, loading, error, emptyMessage, onRetry }: Props) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={tokens.colorPrimary} />
        <Text style={[styles.caption, { color: tokens.colorTextSecondary }]}>Carregando…</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={[styles.panel, { borderColor: tokens.colorError, backgroundColor: tokens.colorBgContainer }]}>
        <Text style={[styles.title, { color: tokens.colorError }]}>Não foi possível carregar</Text>
        <Text style={{ color: tokens.colorTextSecondary }}>{error}</Text>
        {onRetry ? (
          <Pressable onPress={onRetry} style={[styles.button, { borderColor: tokens.colorPrimary }]}>
            <Text style={{ color: tokens.colorPrimary, fontWeight: '600' }}>Tentar novamente</Text>
          </Pressable>
        ) : null}
      </View>
    )
  }

  if (emptyMessage) {
    return (
      <View style={styles.center}>
        <Text style={{ color: tokens.colorTextSecondary, textAlign: 'center' }}>{emptyMessage}</Text>
      </View>
    )
  }

  return null
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 8 },
  caption: { fontSize: 14 },
  panel: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 },
  title: { fontWeight: '700', fontSize: 16 },
  button: { marginTop: 8, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
})
