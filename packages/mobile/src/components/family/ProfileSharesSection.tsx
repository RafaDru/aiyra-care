import { useCallback, useEffect, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { api } from '@/lib/api'
import type { CareCircleSummary, OwnedPatient, ProfileShare } from '@/lib/api.types'
import { StatePanel } from '@/components/StatePanel'
import { SectionCard } from '@/components/family/SectionCard'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export function ProfileSharesSection() {
  const { tokens } = useAiyraTheme()
  const [sent, setSent] = useState<ProfileShare[]>([])
  const [incoming, setIncoming] = useState<ProfileShare[]>([])
  const [ownedPatients, setOwnedPatients] = useState<OwnedPatient[]>([])
  const [circles, setCircles] = useState<CareCircleSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [targetEmail, setTargetEmail] = useState('')
  const [patientId, setPatientId] = useState<string | undefined>()
  const [legitimacyAck, setLegitimacyAck] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [acceptTarget, setAcceptTarget] = useState<ProfileShare | null>(null)
  const [acceptCircleId, setAcceptCircleId] = useState<string | undefined>()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sentRows, incomingRows, circleRows, owned] = await Promise.all([
        api.familyAccess.listProfileSharesSent(),
        api.familyAccess.listProfileSharesIncoming(),
        api.careCircles.list(),
        api.familyAccess.listOwnedPatients(),
      ])
      setSent(sentRows)
      setIncoming(incomingRows)
      setOwnedPatients(owned)
      setCircles(circleRows.filter((c) => c.memberRole === 'owner' || c.memberRole === 'admin'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar compartilhamentos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const sendShare = async () => {
    if (!patientId || !targetEmail.trim() || !legitimacyAck) return
    setSubmitting(true)
    try {
      await api.familyAccess.createProfileShare({
        patientId,
        targetAccountEmail: targetEmail.trim(),
        legitimacyAck: true,
      })
      setModalOpen(false)
      setTargetEmail('')
      setPatientId(undefined)
      setLegitimacyAck(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao compartilhar')
    } finally {
      setSubmitting(false)
    }
  }

  const acceptShare = async () => {
    if (!acceptTarget || !acceptCircleId) return
    setSubmitting(true)
    try {
      await api.familyAccess.acceptProfileShare({ inviteId: acceptTarget.id, circleId: acceptCircleId })
      setAcceptTarget(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao aceitar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SectionCard title="Compartilhar perfil entre famílias" subtitle="API `/family-access/profile-shares`.">
      {loading ? <StatePanel tokens={tokens} loading /> : null}
      {error ? <StatePanel tokens={tokens} error={error} onRetry={() => void load()} /> : null}

      <Text style={{ color: tokens.colorTextBase, fontWeight: '600', marginTop: 8 }}>Recebidos</Text>
      {incoming.length === 0 ? (
        <Text style={{ color: tokens.colorTextSecondary, marginBottom: 8 }}>Nenhum pendente.</Text>
      ) : (
        incoming.map((row) => (
          <View key={row.id} style={styles.row}>
            <Text style={{ color: tokens.colorTextBase, flex: 1 }}>
              {row.patientName} · {row.status}
            </Text>
            {row.status === 'pending' ? (
              <Pressable
                onPress={() => {
                  setAcceptTarget(row)
                  setAcceptCircleId(circles[0]?.id)
                }}
              >
                <Text style={{ color: tokens.colorPrimary }}>Aceitar</Text>
              </Pressable>
            ) : null}
          </View>
        ))
      )}

      <Text style={{ color: tokens.colorTextBase, fontWeight: '600', marginTop: 12 }}>Enviados</Text>
      {sent.map((row) => (
        <View key={row.id} style={styles.row}>
          <Text style={{ color: tokens.colorTextBase, flex: 1 }}>
            {row.patientName} → {row.targetAccountEmail}
          </Text>
          {row.status === 'pending' ? (
            <Pressable onPress={() => void api.familyAccess.revokeProfileShare(row.id).then(load)}>
              <Text style={{ color: tokens.colorError }}>Revogar</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      <Pressable
        onPress={() => setModalOpen(true)}
        style={[styles.outlineBtn, { borderColor: tokens.colorPrimary }]}
      >
        <Text style={{ color: tokens.colorPrimary, fontWeight: '600' }}>Compartilhar perfil</Text>
      </Pressable>

      <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={[styles.modal, { backgroundColor: tokens.colorBgLayout }]}>
          <Text style={[styles.modalTitle, { color: tokens.colorTextBase }]}>Compartilhar perfil</Text>
          <Text style={{ color: tokens.colorTextSecondary, marginBottom: 8 }}>Perfil de origem</Text>
          {ownedPatients.map((p) => (
            <Pressable key={p.id} onPress={() => setPatientId(p.id)} style={styles.checkRow}>
              <Text style={{ color: tokens.colorTextBase }}>
                {patientId === p.id ? '☑' : '☐'} {p.name}
              </Text>
            </Pressable>
          ))}
          <TextInput
            value={targetEmail}
            onChangeText={setTargetEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="E-mail da conta destino"
            placeholderTextColor={tokens.colorTextSecondary}
            style={[styles.input, { borderColor: tokens.colorBorder, color: tokens.colorTextBase }]}
          />
          <Pressable onPress={() => setLegitimacyAck((v) => !v)} style={styles.checkRow}>
            <Text style={{ color: tokens.colorTextBase }}>
              {legitimacyAck ? '☑' : '☐'} Confirmo legitimidade (LGPD).
            </Text>
          </Pressable>
          <Pressable
            disabled={submitting}
            onPress={() => void sendShare()}
            style={[styles.primaryBtn, { backgroundColor: tokens.colorPrimary }]}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>{submitting ? 'Enviando…' : 'Enviar'}</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal visible={acceptTarget !== null} transparent animationType="fade" onRequestClose={() => setAcceptTarget(null)}>
        <View style={styles.overlay}>
          <View style={[styles.dialog, { backgroundColor: tokens.colorBgContainer, borderColor: tokens.colorBorder }]}>
            <Text style={{ fontWeight: '700', color: tokens.colorTextBase }}>
              Aceitar {acceptTarget?.patientName} em qual círculo?
            </Text>
            {circles.map((c) => (
              <Pressable key={c.id} onPress={() => setAcceptCircleId(c.id)} style={styles.checkRow}>
                <Text style={{ color: tokens.colorTextBase }}>
                  {acceptCircleId === c.id ? '☑' : '☐'} {c.name}
                </Text>
              </Pressable>
            ))}
            <Pressable
              disabled={submitting}
              onPress={() => void acceptShare()}
              style={[styles.primaryBtn, { backgroundColor: tokens.colorPrimary }]}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Confirmar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SectionCard>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  outlineBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  modal: { flex: 1, padding: 16, paddingTop: 48 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  checkRow: { paddingVertical: 8 },
  primaryBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  dialog: { borderWidth: 1, borderRadius: 12, padding: 16 },
})
