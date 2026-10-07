import { useCallback, useEffect, useState } from 'react'
import * as DocumentPicker from 'expo-document-picker'
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
import { MaskedField } from '@/components/form/MaskedField'
import { useToast } from '@/contexts/ToastContext'
import { api } from '@/lib/api'
import type { ScheduledEventKind } from '@/lib/api.types'
import { DUAL_ENTRY_FAB_RADIUS } from '@/lib/dual-entry-layout'
import {
  formatDateBrInput,
  formatTimeBrInput,
  isoToDateTimeBrParts,
  parseDateTimeBrToIso,
} from '@/lib/input-masks'
import type { QuickCaptureKind } from '@/lib/quick-capture-bus'
import { useAiyraTheme } from '@/theme/useAiyraTheme'
import type { Patient } from '@/lib/api.types'

const KINDS: QuickCaptureKind[] = ['note', 'symptom', 'measurement', 'medication', 'agenda', 'document']
const THREAD_ENTRY_KINDS: QuickCaptureKind[] = ['note', 'symptom']
const AGENDA_KINDS: ScheduledEventKind[] = ['reminder', 'appointment', 'task']

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

function defaultAgendaDateTime(): { date: string; time: string } {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return isoToDateTimeBrParts(d.toISOString())
}

function defaultNowDateTime(): { date: string; time: string } {
  return isoToDateTimeBrParts(new Date().toISOString())
}

/** Sheet de registro rápido — paridade web (nota, sintoma, medição, medicação, agenda, documento). */
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
  const [medicationName, setMedicationName] = useState('')
  const [doseGiven, setDoseGiven] = useState('')
  const [medicationNotes, setMedicationNotes] = useState('')
  const [medDateBr, setMedDateBr] = useState('')
  const [medTimeBr, setMedTimeBr] = useState('')
  const [agendaTitle, setAgendaTitle] = useState('')
  const [agendaKind, setAgendaKind] = useState<ScheduledEventKind>('reminder')
  const [agendaDescription, setAgendaDescription] = useState('')
  const [agendaDateBr, setAgendaDateBr] = useState('')
  const [agendaTimeBr, setAgendaTimeBr] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const resetForms = useCallback(() => {
    setNoteBody('')
    setTemperature('')
    setHeartRate('')
    setSpo2('')
    setMedicationName('')
    setDoseGiven('')
    setMedicationNotes('')
    const now = defaultNowDateTime()
    setMedDateBr(now.date)
    setMedTimeBr(now.time)
    setAgendaTitle('')
    setAgendaKind('reminder')
    setAgendaDescription('')
    const agendaWhen = defaultAgendaDateTime()
    setAgendaDateBr(agendaWhen.date)
    setAgendaTimeBr(agendaWhen.time)
  }, [])

  useEffect(() => {
    if (!visible) return
    setKind(initialKind ?? 'note')
    resetForms()
  }, [visible, initialKind, resetForms])

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

  const saveMedication = async () => {
    if (!patientId) return
    const name = medicationName.trim()
    if (!name) {
      toast.info(t('quickCapture.medicationNameRequired'))
      return
    }
    const administeredIso = parseDateTimeBrToIso(medDateBr, medTimeBr)
    if (!administeredIso) {
      toast.info(t('quickCapture.invalidWhen'))
      return
    }
    setSaving(true)
    try {
      await api.medicationAdministrations.create({
        patientId,
        medicationName: name,
        administeredAt: administeredIso,
        doseGiven: doseGiven.trim() || undefined,
        notes: medicationNotes.trim() || undefined,
      })
      toast.success(t('quickCapture.saved'))
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('quickCapture.error'))
    } finally {
      setSaving(false)
    }
  }

  const saveAgenda = async () => {
    if (!patientId) return
    const title = agendaTitle.trim()
    if (!title) {
      toast.info(t('overview.agenda.titleRequired'))
      return
    }
    if (title.length > 500) {
      toast.info(t('overview.agenda.titleTooLong'))
      return
    }
    const scheduledIso = parseDateTimeBrToIso(agendaDateBr, agendaTimeBr)
    if (!scheduledIso) {
      toast.info(t('overview.agenda.invalidWhen'))
      return
    }
    setSaving(true)
    try {
      await api.scheduledEvents.create({
        patientId,
        title,
        scheduledAt: scheduledIso,
        kind: agendaKind,
        description: agendaDescription.trim() || undefined,
        status: 'planned',
      })
      toast.success(t('quickCapture.saved'))
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('quickCapture.error'))
    } finally {
      setSaving(false)
    }
  }

  const pickAndUploadDocument = async () => {
    if (!patientId) {
      toast.info(t('quickCapture.pickPatient'))
      return
    }
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    setUploading(true)
    try {
      await api.documents.upload(patientId, 'other', {
        uri: asset.uri,
        name: asset.name ?? 'documento',
        mimeType: asset.mimeType,
      })
      toast.success(t('quickCapture.saved'))
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('quickCapture.error'))
    } finally {
      setUploading(false)
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
    if (kind === 'medication') {
      void saveMedication()
      return
    }
    if (kind === 'agenda') {
      void saveAgenda()
      return
    }
  }

  const showThreadForm = THREAD_ENTRY_KINDS.includes(kind)
  const showMeasurementForm = kind === 'measurement'
  const showMedicationForm = kind === 'medication'
  const showAgendaForm = kind === 'agenda'
  const showDocumentForm = kind === 'document'
  const showSaveButton = !showDocumentForm

  const inputStyle = [
    styles.input,
    {
      borderColor: tokens.colorBorder,
      backgroundColor: tokens.colorBgContainer,
      color: tokens.colorTextBase,
      borderRadius: DUAL_ENTRY_FAB_RADIUS,
    },
  ]

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
                style={inputStyle}
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
                  style={[styles.measureInput, inputStyle[1]]}
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
                  style={[styles.measureInput, inputStyle[1]]}
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
                  style={[styles.measureInput, inputStyle[1]]}
                />
              </View>
            </View>
          ) : null}

          {showMedicationForm ? (
            <View style={{ marginTop: 12, gap: 12 }}>
              <View style={{ gap: 6 }}>
                <Text style={[styles.label, { color: tokens.colorTextBase }]}>{t('quickCapture.whenLabel')}</Text>
                <View style={styles.dateTimeRow}>
                  <MaskedField
                    tokens={tokens}
                    value={medDateBr}
                    onChangeText={setMedDateBr}
                    format={formatDateBrInput}
                    placeholder="DD/MM/AAAA"
                    keyboardType="number-pad"
                    style={{ flex: 1, borderRadius: DUAL_ENTRY_FAB_RADIUS }}
                  />
                  <MaskedField
                    tokens={tokens}
                    value={medTimeBr}
                    onChangeText={setMedTimeBr}
                    format={formatTimeBrInput}
                    placeholder="HH:MM"
                    keyboardType="number-pad"
                    style={{ width: 100, borderRadius: DUAL_ENTRY_FAB_RADIUS }}
                  />
                </View>
              </View>
              <View style={{ gap: 6 }}>
                <Text style={[styles.label, { color: tokens.colorTextBase }]}>{t('quickCapture.medicationNameLabel')}</Text>
                <TextInput
                  value={medicationName}
                  onChangeText={setMedicationName}
                  placeholder={t('quickCapture.medicationNamePlaceholder')}
                  placeholderTextColor={tokens.colorTextSecondary}
                  style={[styles.singleLineInput, inputStyle[1]]}
                />
              </View>
              <View style={{ gap: 6 }}>
                <Text style={[styles.label, { color: tokens.colorTextBase }]}>{t('quickCapture.doseLabel')}</Text>
                <TextInput
                  value={doseGiven}
                  onChangeText={setDoseGiven}
                  placeholder={t('quickCapture.dosePlaceholder')}
                  placeholderTextColor={tokens.colorTextSecondary}
                  style={[styles.singleLineInput, inputStyle[1]]}
                />
              </View>
              <View style={{ gap: 6 }}>
                <Text style={[styles.label, { color: tokens.colorTextBase }]}>{t('quickCapture.notesLabel')}</Text>
                <TextInput
                  value={medicationNotes}
                  onChangeText={setMedicationNotes}
                  multiline
                  placeholderTextColor={tokens.colorTextSecondary}
                  style={inputStyle}
                />
              </View>
            </View>
          ) : null}

          {showAgendaForm ? (
            <View style={{ marginTop: 12, gap: 12 }}>
              <View style={{ gap: 6 }}>
                <Text style={[styles.label, { color: tokens.colorTextBase }]}>{t('overview.agenda.fieldTitle')}</Text>
                <TextInput
                  value={agendaTitle}
                  onChangeText={setAgendaTitle}
                  placeholder={t('quickCapture.agendaTitlePlaceholder')}
                  placeholderTextColor={tokens.colorTextSecondary}
                  style={[styles.singleLineInput, inputStyle[1]]}
                />
              </View>
              <View style={{ gap: 6 }}>
                <Text style={[styles.label, { color: tokens.colorTextBase }]}>{t('overview.agenda.fieldKind')}</Text>
                <View style={styles.kindRow}>
                  {AGENDA_KINDS.map((k) => {
                    const active = agendaKind === k
                    return (
                      <Pressable
                        key={k}
                        onPress={() => setAgendaKind(k)}
                        style={[
                          styles.kindChip,
                          {
                            borderColor: active ? tokens.colorPrimary : tokens.colorBorder,
                            backgroundColor: active ? tokens.colorBgContainer : tokens.colorBgLayout,
                            borderRadius: DUAL_ENTRY_FAB_RADIUS,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: active ? tokens.colorPrimary : tokens.colorTextSecondary,
                            fontSize: 12,
                          }}
                        >
                          {t(`overview.agenda.kind.${k}`)}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>
              <View style={{ gap: 6 }}>
                <Text style={[styles.label, { color: tokens.colorTextBase }]}>{t('overview.agenda.fieldWhen')}</Text>
                <View style={styles.dateTimeRow}>
                  <MaskedField
                    tokens={tokens}
                    value={agendaDateBr}
                    onChangeText={setAgendaDateBr}
                    format={formatDateBrInput}
                    placeholder="DD/MM/AAAA"
                    keyboardType="number-pad"
                    style={{ flex: 1, borderRadius: DUAL_ENTRY_FAB_RADIUS }}
                  />
                  <MaskedField
                    tokens={tokens}
                    value={agendaTimeBr}
                    onChangeText={setAgendaTimeBr}
                    format={formatTimeBrInput}
                    placeholder="HH:MM"
                    keyboardType="number-pad"
                    style={{ width: 100, borderRadius: DUAL_ENTRY_FAB_RADIUS }}
                  />
                </View>
              </View>
              <View style={{ gap: 6 }}>
                <Text style={[styles.label, { color: tokens.colorTextBase }]}>{t('overview.agenda.fieldDescription')}</Text>
                <TextInput
                  value={agendaDescription}
                  onChangeText={setAgendaDescription}
                  multiline
                  placeholderTextColor={tokens.colorTextSecondary}
                  style={inputStyle}
                />
              </View>
            </View>
          ) : null}

          {showDocumentForm ? (
            <View style={{ marginTop: 12, gap: 12 }}>
              <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>{t('quickCapture.documentHint')}</Text>
              <Pressable
                onPress={() => void pickAndUploadDocument()}
                disabled={uploading || !patientId}
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: tokens.colorPrimary,
                    opacity: uploading || !patientId ? 0.6 : 1,
                    borderRadius: DUAL_ENTRY_FAB_RADIUS,
                  },
                ]}
              >
                <Text style={styles.saveLabel}>
                  {uploading ? t('patient.documents.uploading') : t('quickCapture.uploadDocument')}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {showSaveButton ? (
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
          ) : null}
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
  input: { borderWidth: 1, padding: 12, minHeight: 80, textAlignVertical: 'top' },
  singleLineInput: { borderWidth: 1, padding: 12, fontSize: 16 },
  measureRow: { gap: 6 },
  measureLabel: { fontSize: 14, fontWeight: '600' },
  measureInput: { borderWidth: 1, padding: 12, fontSize: 16 },
  dateTimeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  saveBtn: { marginTop: 20, paddingVertical: 14, alignItems: 'center' },
  saveLabel: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
