import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { AiyraThemeTokens } from '@/theme/useAiyraTheme'

type Props = {
  tokens: AiyraThemeTokens
  checked: boolean
  onToggle: () => void
  label: string
  hint?: string
  disabled?: boolean
}

export function AuthPreferenceRow({ tokens, checked, onToggle, label, hint, disabled }: Props) {
  return (
    <Pressable
      onPress={() => !disabled && onToggle()}
      style={[styles.row, disabled && { opacity: 0.5 }]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: tokens.colorBorder,
            backgroundColor: checked ? tokens.colorPrimary : tokens.colorBgContainer,
          },
        ]}
      >
        {checked ? <Text style={styles.checkMark}>✓</Text> : null}
      </View>
      <View style={styles.textCol}>
        <Text style={{ color: tokens.colorTextBase, fontSize: 14, fontWeight: '500' }}>{label}</Text>
        {hint ? (
          <Text style={{ color: tokens.colorTextSecondary, fontSize: 12, lineHeight: 18, marginTop: 2 }}>
            {hint}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  textCol: { flex: 1 },
})
