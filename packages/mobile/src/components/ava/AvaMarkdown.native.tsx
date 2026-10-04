import { Linking, StyleSheet, Text, View } from 'react-native'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = {
  content: string
}

/** Native: plain text (markdown-it/punycode não rodam no Hermes). Web usa AvaMarkdown.web.tsx. */
export function AvaMarkdown({ content }: Props) {
  const { tokens } = useAiyraTheme()
  const parts = content.split(/(https?:\/\/[^\s]+)/g)

  return (
    <View style={styles.wrap}>
      <Text style={[styles.body, { color: tokens.colorTextBase }]}>
        {parts.map((part, i) => {
          if (/^https?:\/\//.test(part)) {
            return (
              <Text
                key={i}
                style={{ color: tokens.colorLink }}
                onPress={() => void Linking.openURL(part)}
              >
                {part}
              </Text>
            )
          }
          return <Text key={i}>{part}</Text>
        })}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flexShrink: 1 },
  body: { fontSize: 15, lineHeight: 22 },
})
