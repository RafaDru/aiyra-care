import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import type { AiyraThemeTokens } from '@/theme/useAiyraTheme'

type Props = TextInputProps & {
  tokens: AiyraThemeTokens
  label: string
  hint?: string
}

export function FormField({ tokens, label, hint, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: tokens.colorTextBase }]}>{label}</Text>
      <TextInput
        placeholderTextColor={tokens.colorTextSecondary}
        style={[
          styles.input,
          { borderColor: tokens.colorBorder, color: tokens.colorTextBase, backgroundColor: tokens.colorBgContainer },
          style,
        ]}
        {...rest}
      />
      {hint ? <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>{hint}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
})
