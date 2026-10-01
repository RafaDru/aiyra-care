import { useCallback, useEffect, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { api } from '@/lib/api'
import type { CareCircleSummary, FamilyInvite, OwnedPatient } from '@/lib/api.types'
import { StatePanel } from '@/components/StatePanel'
import { SectionCard } from '@/components/family/SectionCard'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export function FamilyInvitesSection() {
  const { tokens } = useAiyraTheme()
  const [invites, setInvites] = useState<FamilyInvite[]>([])
  const [circles, setCircles] = useState<CareCircleSummary[]>([])
  const [ownedPatients, setOwnedPatients] = useState<OwnedPatient[]>([])
  const [selectedCircleId, setSelectedCircleId] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([])
  const [legitimacyAck, setLegitimacyAck] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lastAcceptUrl, setLastAcceptUrl] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [inv, circleRows] = await Promise.all([api.familyAccess.listInvites(), api.careCircles.list()])
      setInvites(inv)
      const manageable = circleRows.filter((c) => c.memberRole === 'owner' || c.memberRole === 'admin')
      setCircles(manageable)
      const defaultCircle = manageable[0]?.id
      setSelectedCircleId((prev) => prev ?? defaultCircle)
      const owned = await api.familyAccess.listOwnedPatients(defaultCircle ?? undefined)
      setOwnedPatients(owned)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar convites')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const togglePatient = (id: string) => {
    setSelectedPatientIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const createInvite = async () => {
    if (!email.trim() || selectedPatientIds.length === 0 || !legitimacyAck) return
    setSubmitting(true)
    try {
      const result = await api.familyAccess.createInvite({
        inviteeEmail: email.trim(),
        patientIds: selectedPatientIds,
        careCircleId: selectedCircleId,
        legitimacyAck: true,
      })
      setLastAcceptUrl(result.acceptUrl)
      setModalOpen(false)
      setEmail('')
      setSelectedPatientIds([])
      setLegitimacyAck(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar convite')
    } finally {
      setSubmitting(false)
    }
  }

  const revoke = async (id: string) => {
    try {
      await api.familyAccess.revokeInvite(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao revogar')
    }
  }

  return (
    <SectionCard title="Convites por e-mail" subtitle="Mesma API `/family-access/invites` do web.">
      {loading ? <StatePanel tokens={tokens} loading /> : null}
      {error ? <StatePanel tokens={tokens} error={error} onRetry={() => void load()} /> : null}
      {lastAcceptUrl ? (
        <Text style={{ color: tokens.colorPrimary, marginBottom: 8 }} selectable>
          Link de aceite: {lastAcceptUrl}
        </Text>
      ) : null}
      {invites.map((inv) => (
        <View key={inv.id} style={styles.inviteRow}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: tokens.colorTextBase, fontWeight: '600' }}>{inv.inviteeEmail}</Text>
            <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>
              {inv.status} · {inv.patientIds.length} perfil(is)
            </Text>
          </View>
          {inv.status === 'pending' ? (
            <Pressable onPress={() => void revoke(inv.id)}>
              <Text style={{ color: tokens.colorError }}>Revogar</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      <Pressable
        onPress={() => setModalOpen(true)}
        style={[styles.outlineBtn, { borderColor: tokens.colorPrimary }]}
      >
        <Text style={{ color: tokens.colorPrimary, fontWeight: '600' }}>Convidar cuidador</Text>
      </Pressable>

      <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={[styles.modal, { backgroundColor: tokens.colorBgLayout }]}>
          <Text style={[styles.modalTitle, { color: tokens.colorTextBase }]}>Novo convite</Text>
          {circles.length > 1 ? (
            <Text style={{ color: tokens.colorTextSecondary, marginBottom: 8 }}>Círculo: {selectedCircleId}</Text>
          ) : null}
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="E-mail do convidado"
            placeholderTextColor={tokens.colorTextSecondary}
            style={[styles.input, { borderColor: tokens.colorBorder, color: tokens.colorTextBase }]}
          />
          <Text style={{ color: tokens.colorTextSecondary, marginBottom: 8 }}>Perfis que poderá ver:</Text>
          {ownedPatients.map((p) => (
            <Pressable key={p.id} onPress={() => togglePatient(p.id)} style={styles.checkRow}>
              <Text style={{ color: tokens.colorTextBase }}>
                {selectedPatientIds.includes(p.id) ? '☑' : '☐'} {p.name}
              </Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setLegitimacyAck((v) => !v)} style={styles.checkRow}>
            <Text style={{ color: tokens.colorTextBase }}>
              {legitimacyAck ? '☑' : '☐'} Confirmo legitimidade para compartilhar estes dados (LGPD).
            </Text>
          </Pressable>
          <Pressable
            disabled={submitting}
            onPress={() => void createInvite()}
            style={[styles.primaryBtn, { backgroundColor: tokens.colorPrimary }]}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>{submitting ? 'Enviando…' : 'Enviar convite'}</Text>
          </Pressable>
          <Pressable onPress={() => setModalOpen(false)} style={{ marginTop: 12, alignItems: 'center' }}>
            <Text style={{ color: tokens.colorTextSecondary }}>Cancelar</Text>
          </Pressable>
        </View>
      </Modal>
    </SectionCard>
  )
}

const styles = StyleSheet.create({
  inviteRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  outlineBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  modal: { flex: 1, padding: 16, paddingTop: 48 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  checkRow: { paddingVertical: 8 },
  primaryBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
})
