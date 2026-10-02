import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { api } from '@/lib/api'
import type { LegalDocumentKind } from '@/lib/api.types'
import { legalKindLabel } from '@/lib/legal-labels'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = {
  kind: LegalDocumentKind | null
  visible: boolean
  onClose: () => void
}

export function LegalDocumentModal({ kind, visible, onClose }: Props) {
  const { tokens } = useAiyraTheme()
  const [loading, setLoading] = useState(false)
  const [body, setBody] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!visible || !kind) {
      setBody(null)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    api.compliance
      .getCurrent(kind)
      .then((doc) => {
        if (!cancelled) setBody(doc.content ?? doc.title)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [visible, kind])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.shell, { backgroundColor: tokens.colorBgLayout }]}>
        <View style={[styles.header, { borderBottomColor: tokens.colorBorder }]}>
          <Text style={[styles.title, { color: tokens.colorTextBase }]}>
            {kind ? legalKindLabel(kind) : ''}
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar">
            <Text style={{ color: tokens.colorPrimary, fontWeight: '600' }}>Fechar</Text>
          </Pressable>
        </View>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={tokens.colorPrimary} />
        ) : error ? (
          <Text style={[styles.error, { color: tokens.colorError }]}>{error}</Text>
        ) : (
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={{ color: tokens.colorTextBase, lineHeight: 22 }}>{body}</Text>
          </ScrollView>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '600', flex: 1, marginRight: 12 },
  body: { padding: 16, paddingBottom: 32 },
  error: { padding: 16 },
})
