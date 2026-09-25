import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import type { AiyraThemeTokens } from '@/theme/useAiyraTheme'

type Props = {
  tokens: AiyraThemeTokens
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
  autoComplete?: 'password' | 'password-new'
  editable?: boolean
  onSubmitEditing?: () => void
}

export function PasswordField({
  tokens,
  value,
  onChangeText,
  placeholder = 'Senha',
  autoComplete = 'password',
  editable = true,
  onSubmitEditing,
}: Props) {
  const [visible, setVisible] = useState(false)

  return (
    <View style={[styles.wrap, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}>
      <TextInput
        secureTextEntry={!visible}
        autoComplete={autoComplete}
        placeholder={placeholder}
        placeholderTextColor={tokens.colorTextSecondary}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        onSubmitEditing={onSubmitEditing}
        style={[styles.input, { color: tokens.colorTextBase }]}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
        hitSlop={8}
        style={styles.toggle}
      >
        <Text style={{ color: tokens.colorPrimary, fontSize: 13, fontWeight: '600' }}>
          {visible ? 'Ocultar' : 'Mostrar'}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingRight: 8,
  },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  toggle: { paddingHorizontal: 8, paddingVertical: 6 },
})
