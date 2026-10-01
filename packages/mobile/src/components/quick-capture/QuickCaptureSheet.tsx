import { useCallback, useEffect, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AvaPatientLensPicker } from '@/components/ava/AvaPatientLensPicker'
import { useToast } from '@/contexts/ToastContext'
import { api } from '@/lib/api'
import type { QuickCaptureKind } from '@/lib/quick-capture-bus'
import { useAiyraTheme } from '@/theme/useAiyraTheme'
import type { Patient } from '@/lib/api.types'

const KINDS: QuickCaptureKind[] = ['note', 'measurement', 'medication', 'agenda', 'document']

type Props = {
  visible: boolean
  onClose: () => void
  patients: Patient[]
  patientId: string | null
  routePatientId: string | null
  onPatientChange: (id: string) => void
  initialKind?: QuickCaptureKind
}

/** Sheet de registro rápido — MVP: nota em health thread; demais kinds em fase seguinte. */
export function QuickCaptureSheet({
  visible,
  onClose,
  patients,
  patientId,
  routePatientId,
  onPatientChange,
  initialKind,
}: Props) {
  const { t } = useTranslation()
  const toast = useToast()
  const { tokens } = useAiyraTheme()
  const insets = useSafeAreaInsets()
  const [kind, setKind] = useState<QuickCaptureKind>(initialKind ?? 'note')
  const [noteBody, setNoteBody] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    setKind(initialKind ?? 'note')
    setNoteBody('')
  }, [visible, initialKind])

  const resolveThreadId = useCallback(async (): Promise<string> => {
    if (!patientId) throw new Error('no_patient')
    const threads = await api.healthThreads.list(patientId, true)
    if (threads.length === 1) return threads[0].id
    if (threads.length === 0) {
      const thread = await api.healthThreads.create({
        patientId,
        kind: 'acompanhamento',
        title: t('quickCapture.defaultThreadTitle'),
      })
      return thread.id
    }
    throw new Error('thread_required')
  }, [patientId, t])

  const saveNote = async () => {
    const body = noteBody.trim()
    if (!body) {
      toast.info(t('quickCapture.noteRequired'))
      return
    }
    setSaving(true)
    try {
      const threadId = await resolveThreadId()
      await api.healthThreads.addEntry(threadId, body)
      toast.success(t('quickCapture.saved'))
      onClose()
    } catch (err) {
      if (err instanceof Error && err.message === 'thread_required') {
        toast.info(t('quickCapture.threadRequired'))
      } else {
        toast.error(err instanceof Error ? err.message : t('quickCapture.error'))
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSave = () => {
    if (!patientId) {
      toast.info(t('quickCapture.pickPatient'))
      return
    }
    if (kind === 'note') {
      void saveNote()
      return
    }
    toast.info(t('quickCapture.comingSoon'))
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          { backgroundColor: tokens.colorBgLayout, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: tokens.colorTextBase }]}>{t('quickCapture.title')}</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
            <Text style={{ color: tokens.colorPrimary, fontWeight: '600', fontSize: 16 }}>{t('common.close')}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: tokens.colorTextBase }]}>{t('quickCapture.patientLabel')}</Text>
          {patients.length === 0 ? (
            <Text style={{ color: tokens.colorTextSecondary }}>{t('quickCapture.noPatients')}</Text>
          ) : patientId ? (
            <AvaPatientLensPicker
              patients={patients}
              patientId={patientId}
              routePatientId={routePatientId}
              lensOverridesRoute={false}
              onSelect={onPatientChange}
            />
          ) : null}

          <Text style={[styles.label, { color: tokens.colorTextBase, marginTop: 16 }]}>{t('quickCapture.typeLabel')}</Text>
          <View style={styles.kindRow}>
            {KINDS.map((k) => {
              const active = kind === k
              return (
                <Pressable
                  key={k}
                  onPress={() => setKind(k)}
                  style={[
                    styles.kindChip,
                    {
                      borderColor: active ? tokens.colorPrimary : tokens.colorBorder,
                      backgroundColor: active ? tokens.colorBgLayout : tokens.colorBgContainer,
                    },
                  ]}
                >
                  <Text style={{ color: active ? tokens.colorPrimary : tokens.colorTextSecondary, fontSize: 12 }}>
                    {t(`quickCapture.kind.${k}`)}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {kind === 'note' ? (
            <View style={{ marginTop: 12, gap: 6 }}>
              <Text style={[styles.label, { color: tokens.colorTextBase }]}>{t('quickCapture.noteLabel')}</Text>
              <TextInput
                value={noteBody}
                onChangeText={setNoteBody}
                placeholder={t('quickCapture.notePlaceholder')}
                placeholderTextColor={tokens.colorTextSecondary}
                multiline
                style={[
                  styles.input,
                  {
                    borderColor: tokens.colorBorder,
                    backgroundColor: tokens.colorBgContainer,
                    color: tokens.colorTextBase,
                  },
                ]}
              />
            </View>
          ) : (
            <Text style={{ color: tokens.colorTextSecondary, marginTop: 12 }}>{t('quickCapture.comingSoon')}</Text>
          )}

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, { backgroundColor: tokens.colorPrimary, opacity: saving ? 0.6 : 1 }]}
          >
            <Text style={styles.saveLabel}>{t('quickCapture.save')}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  content: { paddingBottom: 24, gap: 8 },
  label: { fontSize: 14, fontWeight: '600' },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kindChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 100, textAlignVertical: 'top' },
  saveBtn: { marginTop: 20, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveLabel: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
