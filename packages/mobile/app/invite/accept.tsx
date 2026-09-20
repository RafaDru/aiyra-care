import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import type { InvitePreview } from '@/lib/api.types'
import { StatePanel } from '@/components/StatePanel'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export default function InviteAcceptScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>()
  const inviteToken = typeof token === 'string' ? token : ''
  const { session, loading: authLoading, configured } = useAuth()
  const { tokens } = useAiyraTheme()
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!inviteToken) {
      setError('Link inválido — falta o token do convite.')
      setLoading(false)
      return
    }
    api.familyAccess
      .previewInvite(inviteToken)
      .then(setPreview)
      .catch(() => setError('Convite não encontrado ou expirado.'))
      .finally(() => setLoading(false))
  }, [inviteToken])

  if (!authLoading && configured && !session) {
    return <Redirect href={`/(auth)/login?redirect=invite&token=${encodeURIComponent(inviteToken)}`} />
  }

  const accept = async () => {
    if (!inviteToken) return
    setAccepting(true)
    setError(null)
    try {
      await api.familyAccess.acceptInvite(inviteToken)
      router.replace('/(app)/(tabs)')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível aceitar o convite.')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.colorBgLayout }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: tokens.colorTextBase }]}>Convite de família</Text>
      <Text style={{ color: tokens.colorTextSecondary, marginBottom: 16 }}>
        Aceite para ver os perfis de saúde compartilhados com você.
      </Text>

      {loading ? (
        <StatePanel tokens={tokens} loading />
      ) : error || !preview ? (
        <StatePanel tokens={tokens} error={error ?? 'Convite indisponível'} />
      ) : (
        <View style={[styles.card, { backgroundColor: tokens.colorBgContainer, borderColor: tokens.colorBorder }]}>
          <Text style={{ color: tokens.colorTextSecondary }}>De</Text>
          <Text style={[styles.rowValue, { color: tokens.colorTextBase }]}>
            {preview.inviterDisplayName ?? 'Cuidador AiyraCare'}
          </Text>
          {preview.circleName ? (
            <>
              <Text style={{ color: tokens.colorTextSecondary, marginTop: 12 }}>Círculo</Text>
              <Text style={[styles.rowValue, { color: tokens.colorTextBase }]}>{preview.circleName}</Text>
            </>
          ) : null}
          <Text style={{ color: tokens.colorTextSecondary, marginTop: 12 }}>Perfis</Text>
          <Text style={[styles.rowValue, { color: tokens.colorTextBase }]}>{preview.patientNames.join(', ')}</Text>
          <Text style={{ color: tokens.colorTextSecondary, marginTop: 12 }}>E-mail do convite</Text>
          <Text style={[styles.rowValue, { color: tokens.colorTextBase }]}>{preview.inviteeEmail}</Text>

          {preview.status !== 'pending' ? (
            <Text style={{ color: tokens.colorWarning, marginTop: 16 }}>
              Este convite não está mais pendente ({preview.status}).
            </Text>
          ) : (
            <Pressable
              disabled={accepting}
              onPress={() => void accept()}
              style={[styles.primaryBtn, { backgroundColor: tokens.colorPrimary, opacity: accepting ? 0.7 : 1 }]}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>{accepting ? 'Aceitando…' : 'Aceitar convite'}</Text>
            </Pressable>
          )}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 48 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16 },
  rowValue: { fontSize: 16, fontWeight: '600' },
  primaryBtn: { marginTop: 20, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
})
