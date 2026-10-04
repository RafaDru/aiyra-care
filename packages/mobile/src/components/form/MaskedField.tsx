import { TextInput, type TextInputProps } from 'react-native'
import type { AiyraThemeTokens } from '@/theme/useAiyraTheme'

type Props = Omit<TextInputProps, 'value' | 'onChangeText'> & {
  tokens: AiyraThemeTokens
  value: string
  onChangeText: (value: string) => void
  format: (raw: string) => string
}

export function MaskedField({ tokens, value, onChangeText, format, style, ...rest }: Props) {
  return (
    <TextInput
      {...rest}
      value={value}
      onChangeText={(text) => onChangeText(format(text))}
      placeholderTextColor={tokens.colorTextSecondary}
      style={[
        {
          borderWidth: 1,
          borderColor: tokens.colorBorder,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: tokens.colorTextBase,
        },
        style,
      ]}
    />
  )
}
