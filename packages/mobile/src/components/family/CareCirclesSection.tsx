import { useCallback, useEffect, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { api } from '@/lib/api'
import type { CareCircleDetail, CareCircleSummary } from '@/lib/api.types'
import { StatePanel } from '@/components/StatePanel'
import { SectionCard } from '@/components/family/SectionCard'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export function CareCirclesSection() {
  const { tokens } = useAiyraTheme()
  const [circles, setCircles] = useState<CareCircleSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<CareCircleDetail | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCircles(await api.careCircles.list())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar círculos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openDetail = async (id: string) => {
    try {
      setDetail(await api.careCircles.get(id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao abrir círculo')
    }
  }

  const createCircle = async () => {
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    try {
      await api.careCircles.create(name)
      setCreateOpen(false)
      setNewName('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar círculo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard
      title="Círculos de cuidado"
      subtitle="Organize família e quem administra cada grupo (paridade web /care-circles)."
    >
      {loading ? <StatePanel tokens={tokens} loading /> : null}
      {error ? <StatePanel tokens={tokens} error={error} onRetry={() => void load()} /> : null}
      {!loading && !error && circles.length === 0 ? (
        <Text style={{ color: tokens.colorTextSecondary }}>Nenhum círculo ainda.</Text>
      ) : null}
      {circles.map((c) => (
        <Pressable key={c.id} onPress={() => void openDetail(c.id)} style={styles.row}>
          <Text style={{ color: tokens.colorTextBase, fontWeight: '600' }}>{c.name}</Text>
          <Text style={{ color: tokens.colorTextSecondary }}>{c.memberRole ?? 'membro'} ›</Text>
        </Pressable>
      ))}
      <Pressable
        onPress={() => setCreateOpen(true)}
        style={[styles.outlineBtn, { borderColor: tokens.colorPrimary }]}
      >
        <Text style={{ color: tokens.colorPrimary, fontWeight: '600' }}>Novo círculo</Text>
      </Pressable>

      <Modal visible={detail !== null} animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={[styles.modal, { backgroundColor: tokens.colorBgLayout }]}>
          <Text style={[styles.modalTitle, { color: tokens.colorTextBase }]}>{detail?.name}</Text>
          <Text style={{ color: tokens.colorTextSecondary, marginBottom: 8 }}>Membros</Text>
          {detail?.members.map((m) => (
            <Text key={m.id} style={{ color: tokens.colorTextBase, marginBottom: 4 }}>
              {m.displayName ?? m.email ?? m.accountId} · {m.role}
            </Text>
          ))}
          <Text style={{ color: tokens.colorTextSecondary, marginTop: 12, marginBottom: 8 }}>Perfis vinculados</Text>
          {detail?.patients.length ? (
            detail.patients.map((p) => (
              <Text key={p.patientId} style={{ color: tokens.colorTextBase, marginBottom: 4 }}>
                {p.patientName}
              </Text>
            ))
          ) : (
            <Text style={{ color: tokens.colorTextSecondary }}>Nenhum perfil neste círculo.</Text>
          )}
          <Pressable onPress={() => setDetail(null)} style={[styles.primaryBtn, { backgroundColor: tokens.colorPrimary }]}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Fechar</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.overlay}>
          <View style={[styles.dialog, { backgroundColor: tokens.colorBgContainer, borderColor: tokens.colorBorder }]}>
            <Text style={{ fontWeight: '700', color: tokens.colorTextBase, marginBottom: 8 }}>Nome do círculo</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Ex.: Família A"
              placeholderTextColor={tokens.colorTextSecondary}
              style={[styles.input, { borderColor: tokens.colorBorder, color: tokens.colorTextBase }]}
            />
            <Pressable
              disabled={saving}
              onPress={() => void createCircle()}
              style={[styles.primaryBtn, { backgroundColor: tokens.colorPrimary }]}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>{saving ? 'Salvando…' : 'Criar'}</Text>
            </Pressable>
            <Pressable onPress={() => setCreateOpen(false)} style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={{ color: tokens.colorTextSecondary }}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SectionCard>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  outlineBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  modal: { flex: 1, padding: 16, paddingTop: 48 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  primaryBtn: { marginTop: 24, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  dialog: { borderWidth: 1, borderRadius: 12, padding: 16 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
})
