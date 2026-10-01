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
import { router } from 'expo-router'
import { api } from '@/lib/api'
import type { ComplianceStatus, LegalDocumentKind } from '@/lib/api.types'
import { emitComplianceAccepted } from '@/lib/compliance-events'
import { legalKindLabel } from '@/lib/legal-labels'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export default function ComplianceAcceptScreen() {
  const { tokens } = useAiyraTheme()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<ComplianceStatus | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [legalKind, setLegalKind] = useState<LegalDocumentKind | null>(null)
  const [legalBody, setLegalBody] = useState<string | null>(null)
  const [legalLoading, setLegalLoading] = useState(false)

  useEffect(() => {
    api.compliance
      .status()
      .then((s) => {
        setStatus(s)
        if (s.compliant) router.replace('/(app)/(tabs)')
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [])

  const openLegal = async (kind: LegalDocumentKind) => {
    setLegalKind(kind)
    setLegalBody(null)
    setLegalLoading(true)
    try {
      const doc = await api.compliance.getCurrent(kind)
      setLegalBody(doc.content)
    } catch (e) {
      setLegalBody(e instanceof Error ? e.message : 'Não foi possível carregar o documento.')
    } finally {
      setLegalLoading(false)
    }
  }

  const onSubmit = async () => {
    if (!accepted) return
    setSubmitting(true)
    setError(null)
    try {
      const next = await api.compliance.accept()
      setStatus(next)
      if (next.compliant) {
        emitComplianceAccepted()
        router.replace('/(app)/(tabs)')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.colorBgLayout }]}>
        <ActivityIndicator color={tokens.colorPrimary} />
      </View>
    )
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.colorBgLayout }} contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: tokens.colorBgContainer, borderColor: tokens.colorBorder }]}>
        <Text style={[styles.title, { color: tokens.colorTextBase }]}>Termos e privacidade</Text>
        <Text style={{ color: tokens.colorTextSecondary, marginBottom: 16 }}>
          Para continuar, aceite os documentos legais vigentes do AiyraCare.
        </Text>

        {error ? (
          <Text style={{ color: tokens.colorError, marginBottom: 12 }}>{error}</Text>
        ) : null}

        {status && !status.compliant ? (
          <>
            <Text style={{ color: tokens.colorTextBase, marginBottom: 8 }}>Documentos pendentes:</Text>
            {status.pendingKinds.map((kind) => (
              <Pressable key={kind} onPress={() => void openLegal(kind)} style={styles.linkRow}>
                <Text style={{ color: tokens.colorPrimary, fontWeight: '600' }}>{legalKindLabel(kind)}</Text>
              </Pressable>
            ))}

            <Pressable
              onPress={() => setAccepted((v) => !v)}
              style={[styles.checkboxRow, { borderColor: tokens.colorBorder }]}
            >
              <Text style={{ color: tokens.colorTextBase }}>
                {accepted ? '☑' : '☐'} Li e aceito os documentos listados acima.
              </Text>
            </Pressable>

            <Pressable
              disabled={!accepted || submitting}
              onPress={() => void onSubmit()}
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: accepted ? tokens.colorPrimary : tokens.colorBorder,
                  opacity: submitting ? 0.7 : 1,
                },
              ]}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>
                {submitting ? 'Salvando…' : 'Continuar'}
              </Text>
            </Pressable>
          </>
        ) : null}
      </View>

      <Modal visible={legalKind !== null} animationType="slide" onRequestClose={() => setLegalKind(null)}>
        <View style={[styles.modal, { backgroundColor: tokens.colorBgLayout }]}>
          <Text style={[styles.title, { color: tokens.colorTextBase }]}>
            {legalKind ? legalKindLabel(legalKind) : ''}
          </Text>
          {legalLoading ? (
            <ActivityIndicator color={tokens.colorPrimary} style={{ marginTop: 24 }} />
          ) : (
            <ScrollView style={{ flex: 1, marginVertical: 12 }}>
              <Text style={{ color: tokens.colorTextBase, fontSize: 14, lineHeight: 22 }}>{legalBody}</Text>
            </ScrollView>
          )}
          <Pressable
            onPress={() => setLegalKind(null)}
            style={[styles.primaryBtn, { backgroundColor: tokens.colorPrimary }]}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Fechar</Text>
          </Pressable>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  linkRow: { paddingVertical: 8 },
  checkboxRow: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 16, marginBottom: 16 },
  primaryBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  modal: { flex: 1, padding: 16, paddingTop: 48 },
})
