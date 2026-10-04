import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { AiyraThemeTokens } from '@/theme/useAiyraTheme'

type Tone = 'info' | 'warning' | 'success' | 'error'

type Props = {
  tokens: AiyraThemeTokens
  tone: Tone
  children: ReactNode
  actionLabel?: string
  onAction?: () => void
}

function colors(tokens: AiyraThemeTokens, tone: Tone) {
  switch (tone) {
    case 'success':
      return {
        bg: 'rgba(82, 196, 26, 0.12)',
        border: tokens.colorSuccess ?? '#52c41a',
        text: tokens.colorTextBase,
      }
    case 'error':
      return {
        bg: 'rgba(255, 77, 79, 0.1)',
        border: tokens.colorError,
        text: tokens.colorTextBase,
      }
    case 'warning':
      return {
        bg: 'rgba(255, 229, 102, 0.35)',
        border: '#c9a800',
        text: tokens.colorTextBase,
      }
    default:
      return {
        bg: 'rgba(147, 51, 234, 0.08)',
        border: tokens.colorPrimary,
        text: tokens.colorTextBase,
      }
  }
}

export function NoticeBanner({ tokens, tone, children, actionLabel, onAction }: Props) {
  const c = colors(tokens, tone)
  return (
    <View style={[styles.wrap, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.text, { color: c.text }]}>{children}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" style={styles.action}>
          <Text style={{ color: tokens.colorPrimary, fontWeight: '700', fontSize: 14 }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  text: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  action: { alignSelf: 'flex-start' },
})
