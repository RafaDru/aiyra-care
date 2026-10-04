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
import { DUAL_ENTRY_FAB_RADIUS } from '@/lib/dual-entry-layout'
import type { QuickCaptureKind } from '@/lib/quick-capture-bus'
import { useAiyraTheme } from '@/theme/useAiyraTheme'
import type { Patient } from '@/lib/api.types'

const KINDS: QuickCaptureKind[] = ['note', 'symptom', 'measurement', 'medication', 'agenda', 'document']
const THREAD_ENTRY_KINDS: QuickCaptureKind[] = ['note', 'symptom']

type Props = {
  visible: boolean
  onClose: () => void
  patients: Patient[]
  patientId: string | null
  routePatientId: string | null
  onPatientChange: (id: string) => void
  initialKind?: QuickCaptureKind
}

function parseOptionalNumber(raw: string): number | undefined {
  const trimmed = raw.trim().replace(',', '.')
  if (!trimmed) return undefined
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

/** Sheet de registro rápido — nota/sintoma (health thread) + medição (batch); demais kinds em rollout. */
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
  const [temperature, setTemperature] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [spo2, setSpo2] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    setKind(initialKind ?? 'note')
    setNoteBody('')
    setTemperature('')
    setHeartRate('')
    setSpo2('')
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

  const saveThreadEntry = async () => {
    const body = noteBody.trim()
    if (!body) {
      toast.info(t(kind === 'symptom' ? 'quickCapture.symptomRequired' : 'quickCapture.noteRequired'))
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

  const saveMeasurement = async () => {
    if (!patientId) return
    const items = [
      { typeCode: 'temperature', valueNumeric: parseOptionalNumber(temperature) },
      { typeCode: 'heart_rate', valueNumeric: parseOptionalNumber(heartRate) },
      { typeCode: 'spo2', valueNumeric: parseOptionalNumber(spo2) },
    ].filter((i) => i.valueNumeric != null)
    if (!items.length) {
      toast.info(t('quickCapture.measurementRequired'))
      return
    }
    setSaving(true)
    try {
      await api.measurements.createBatch({
        patientId,
        observedAt: new Date().toISOString(),
        items,
      })
      toast.success(t('quickCapture.saved'))
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('quickCapture.error'))
    } finally {
      setSaving(false)
    }
  }

  const handleSave = () => {
    if (!patientId) {
      toast.info(t('quickCapture.pickPatient'))
      return
    }
    if (THREAD_ENTRY_KINDS.includes(kind)) {
      void saveThreadEntry()
      return
    }
    if (kind === 'measurement') {
      void saveMeasurement()
      return
    }
    toast.info(t('quickCapture.comingSoon'))
  }

  const showThreadForm = THREAD_ENTRY_KINDS.includes(kind)
  const showMeasurementForm = kind === 'measurement'

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
                      backgroundColor: active ? tokens.colorBgContainer : tokens.colorBgLayout,
                      borderRadius: DUAL_ENTRY_FAB_RADIUS,
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

          {showThreadForm ? (
            <View style={{ marginTop: 12, gap: 6 }}>
              <Text style={[styles.label, { color: tokens.colorTextBase }]}>
                {t(kind === 'symptom' ? 'quickCapture.symptomLabel' : 'quickCapture.noteLabel')}
              </Text>
              <TextInput
                value={noteBody}
                onChangeText={setNoteBody}
                placeholder={t(
                  kind === 'symptom' ? 'quickCapture.symptomPlaceholder' : 'quickCapture.notePlaceholder',
                )}
                placeholderTextColor={tokens.colorTextSecondary}
                multiline
                style={[
                  styles.input,
                  {
                    borderColor: tokens.colorBorder,
                    backgroundColor: tokens.colorBgContainer,
                    color: tokens.colorTextBase,
                    borderRadius: DUAL_ENTRY_FAB_RADIUS,
                  },
                ]}
              />
            </View>
          ) : null}

          {showMeasurementForm ? (
            <View style={{ marginTop: 12, gap: 12 }}>
              <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>
                {t('quickCapture.measurementWhenHint')}
              </Text>
              <View style={styles.measureRow}>
                <Text style={[styles.measureLabel, { color: tokens.colorTextBase }]}>
                  {t('measurement.type.temperature')}
                </Text>
                <TextInput
                  value={temperature}
                  onChangeText={setTemperature}
                  keyboardType="decimal-pad"
                  placeholder="°C"
                  placeholderTextColor={tokens.colorTextSecondary}
                  style={[
                    styles.measureInput,
                    {
                      borderColor: tokens.colorBorder,
                      backgroundColor: tokens.colorBgContainer,
                      color: tokens.colorTextBase,
                      borderRadius: DUAL_ENTRY_FAB_RADIUS,
                    },
                  ]}
                />
              </View>
              <View style={styles.measureRow}>
                <Text style={[styles.measureLabel, { color: tokens.colorTextBase }]}>
                  {t('measurement.type.heart_rate')}
                </Text>
                <TextInput
                  value={heartRate}
                  onChangeText={setHeartRate}
                  keyboardType="number-pad"
                  placeholder="bpm"
                  placeholderTextColor={tokens.colorTextSecondary}
                  style={[
                    styles.measureInput,
                    {
                      borderColor: tokens.colorBorder,
                      backgroundColor: tokens.colorBgContainer,
                      color: tokens.colorTextBase,
                      borderRadius: DUAL_ENTRY_FAB_RADIUS,
                    },
                  ]}
                />
              </View>
              <View style={styles.measureRow}>
                <Text style={[styles.measureLabel, { color: tokens.colorTextBase }]}>
                  {t('measurement.type.spo2')}
                </Text>
                <TextInput
                  value={spo2}
                  onChangeText={setSpo2}
                  keyboardType="number-pad"
                  placeholder="%"
                  placeholderTextColor={tokens.colorTextSecondary}
                  style={[
                    styles.measureInput,
                    {
                      borderColor: tokens.colorBorder,
                      backgroundColor: tokens.colorBgContainer,
                      color: tokens.colorTextBase,
                      borderRadius: DUAL_ENTRY_FAB_RADIUS,
                    },
                  ]}
                />
              </View>
            </View>
          ) : null}

          {!showThreadForm && !showMeasurementForm ? (
            <Text style={{ color: tokens.colorTextSecondary, marginTop: 12 }}>{t('quickCapture.comingSoon')}</Text>
          ) : null}

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={[
              styles.saveBtn,
              {
                backgroundColor: tokens.colorPrimary,
                opacity: saving ? 0.6 : 1,
                borderRadius: DUAL_ENTRY_FAB_RADIUS,
              },
            ]}
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
  kindChip: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  input: { borderWidth: 1, padding: 12, minHeight: 100, textAlignVertical: 'top' },
  measureRow: { gap: 6 },
  measureLabel: { fontSize: 14, fontWeight: '600' },
  measureInput: { borderWidth: 1, padding: 12, fontSize: 16 },
  saveBtn: { marginTop: 20, paddingVertical: 14, alignItems: 'center' },
  saveLabel: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
