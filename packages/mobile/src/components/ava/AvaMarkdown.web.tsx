import { Linking, StyleSheet, View } from 'react-native'
import Markdown from 'react-native-markdown-display'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = {
  content: string
}

export function AvaMarkdown({ content }: Props) {
  const { tokens } = useAiyraTheme()

  const styles = StyleSheet.create({
    body: { color: tokens.colorTextBase, fontSize: 15, lineHeight: 22 },
    paragraph: { marginTop: 0, marginBottom: 8 },
    bullet_list: { marginBottom: 8 },
    ordered_list: { marginBottom: 8 },
    list_item: { marginBottom: 4 },
    strong: { fontWeight: '700' },
    em: { fontStyle: 'italic' },
    link: { color: tokens.colorLink },
    code_inline: {
      fontFamily: 'monospace',
      backgroundColor: tokens.colorBgLayout,
      paddingHorizontal: 4,
      borderRadius: 4,
    },
    fence: {
      backgroundColor: tokens.colorBgLayout,
      padding: 8,
      borderRadius: 8,
      marginBottom: 8,
    },
    table: { borderWidth: 1, borderColor: tokens.colorBorder, marginBottom: 8 },
    thead: { backgroundColor: tokens.colorBgLayout },
    th: { padding: 6, fontWeight: '700' },
    tr: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: tokens.colorBorder },
    td: { padding: 6 },
    heading1: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
    heading2: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
    heading3: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: tokens.colorPrimary,
      paddingLeft: 10,
      marginBottom: 8,
      opacity: 0.95,
    },
    hr: { backgroundColor: tokens.colorBorder, height: 1, marginVertical: 10 },
  })

  return (
    <View>
      <Markdown
        style={styles}
        onLinkPress={(url) => {
          void Linking.openURL(url)
          return false
        }}
      >
        {content}
      </Markdown>
    </View>
  )
}
