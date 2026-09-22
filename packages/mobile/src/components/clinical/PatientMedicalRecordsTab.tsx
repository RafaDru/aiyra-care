import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { MaskedField } from '@/components/form/MaskedField'
import { SectionCard } from '@/components/family/SectionCard'
import { StatePanel } from '@/components/StatePanel'
import { FormField } from '@/components/ui/FormField'
import { FormSheet } from '@/components/ui/FormSheet'
import { useToast } from '@/contexts/ToastContext'
import { api } from '@/lib/api'
import type { MedicalRecord } from '@/lib/api.types'
import {
  formatClinicalDate,
  formatCurrencyBrl,
  formatRecordSource,
  formatRecordType,
  MEDICAL_RECORD_TYPES,
  type MedicalRecordType,
} from '@/lib/clinical-format'
import { formatDateBrInput, isoDateToBrInput, parseDateBrToIso } from '@/lib/input-masks'
import { webPatientSectionTabUrl } from '@/lib/web-app-url'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = { patientId: string }

function sortRecords(rows: MedicalRecord[]): MedicalRecord[] {
  return [...rows].sort((a, b) => {
    const ta = new Date(a.recordDate).getTime()
    const tb = new Date(b.recordDate).getTime()
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta)
  })
}

export function PatientMedicalRecordsTab({ patientId }: Props) {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const { tokens } = useAiyraTheme()
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<MedicalRecord | null>(null)
  const [recordDateBr, setRecordDateBr] = useState('')
  const [recordType, setRecordType] = useState<MedicalRecordType>('consulta')
  const [description, setDescription] = useState('')
  const [doctorName, setDoctorName] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [clinicName, setClinicName] = useState('')

  const load = useCallback(async () => {
    setError(null)
    try {
      setRecords(await api.medicalRecords.list(patientId))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('clinical.records.loadError'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [patientId, t])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const sorted = useMemo(() => sortRecords(records), [records])
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR'
  const openWeb = () => void Linking.openURL(webPatientSectionTabUrl(patientId, 'clinical', 'records'))

  const resetForm = () => {
    setEditing(null)
    setRecordDateBr('')
    setRecordType('consulta')
    setDescription('')
    setDoctorName('')
    setSpecialty('')
    setClinicName('')
  }

  const openCreate = () => {
    resetForm()
    setSheetOpen(true)
  }

  const openEdit = (row: MedicalRecord) => {
    setEditing(row)
    setRecordDateBr(isoDateToBrInput(row.recordDate))
    const rt = MEDICAL_RECORD_TYPES.includes(row.recordType as MedicalRecordType)
      ? (row.recordType as MedicalRecordType)
      : 'outro'
    setRecordType(rt)
    setDescription(row.description ?? '')
    setDoctorName(row.doctorName ?? '')
    setSpecialty(row.specialty ?? '')
    setClinicName(row.clinicName ?? '')
    setSheetOpen(true)
  }

  const closeSheet = () => {
    setSheetOpen(false)
    resetForm()
  }

  const save = async () => {
    const parsedDate = parseDateBrToIso(recordDateBr)
    if (!parsedDate) {
      toast.info(t('clinical.records.invalidDate'))
      return
    }
    if (!recordType) {
      toast.info(t('clinical.records.typeRequired'))
      return
    }
    setSaving(true)
    try {
      const payload = {
        recordDate: parsedDate,
        recordType,
        description: description.trim() || undefined,
        doctorName: doctorName.trim() || undefined,
        specialty: specialty.trim() || undefined,
        clinicName: clinicName.trim() || undefined,
      }
      if (editing) {
        await api.medicalRecords.update(editing.id, payload)
        toast.success(t('clinical.records.updated'))
      } else {
        await api.medicalRecords.create({
          patientId,
          ...payload,
          source: 'manual',
        })
        toast.success(t('clinical.records.created'))
      }
      closeSheet()
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('clinical.records.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = () => {
    if (!editing) return
    Alert.alert(t('clinical.records.deleteTitle'), t('clinical.records.deleteMessage'), [
      { text: t('clinical.records.cancel'), style: 'cancel' },
      {
        text: t('clinical.records.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setSaving(true)
            try {
              await api.medicalRecords.delete(editing.id)
              toast.success(t('clinical.records.deleted'))
              closeSheet()
              await load()
            } catch (err) {
              toast.error(err instanceof Error ? err.message : t('clinical.records.saveError'))
            } finally {
              setSaving(false)
            }
          })()
        },
      },
    ])
  }

  if (loading && records.length === 0 && !error) return <StatePanel tokens={tokens} loading />
  if (error && records.length === 0) return <StatePanel tokens={tokens} error={error} onRetry={() => void load()} />

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void load()
            }}
            tintColor={tokens.colorPrimary}
          />
        }
      >
        <View>
          <Text style={[styles.title, { color: tokens.colorTextBase }]}>{t('clinical.records.title')}</Text>
          <Text style={{ color: tokens.colorTextSecondary, fontSize: 14 }}>{t('clinical.records.subtitleTx')}</Text>
        </View>

        <Pressable onPress={openCreate} style={[styles.primaryBtn, { backgroundColor: tokens.colorPrimary }]}>
          <Text style={styles.primaryBtnLabel}>{t('clinical.records.add')}</Text>
        </Pressable>

        <Pressable
          onPress={openWeb}
          style={[styles.webHint, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
        >
          <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>{t('clinical.records.webHint')}</Text>
          <Text style={{ color: tokens.colorPrimary, fontWeight: '600' }}>{t('clinical.records.openWeb')}</Text>
        </Pressable>

        {sorted.length === 0 ? (
          <SectionCard title={t('clinical.listTitle')}>
            <Text style={{ color: tokens.colorTextSecondary }}>{t('clinical.records.empty')}</Text>
          </SectionCard>
        ) : (
          <SectionCard title={t('clinical.records.listCount', { count: sorted.length })}>
            <View style={styles.list}>
              {sorted.map((row) => {
                const amount = formatCurrencyBrl(row.chargedAmount)
                return (
                  <Pressable
                    key={row.id}
                    onPress={() => openEdit(row)}
                    style={[styles.row, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
                  >
                    <View style={styles.rowHeader}>
                      <Text style={[styles.itemName, { color: tokens.colorTextBase }]} numberOfLines={2}>
                        {formatRecordType(row.recordType)}
                      </Text>
                      <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>
                        {formatClinicalDate(row.recordDate, locale)}
                      </Text>
                    </View>
                    {row.doctorName || row.specialty ? (
                      <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }} numberOfLines={2}>
                        {[row.doctorName, row.specialty].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}
                    {row.clinicName ? (
                      <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }} numberOfLines={1}>
                        {row.clinicName}
                      </Text>
                    ) : null}
                    {row.description ? (
                      <Text style={{ color: tokens.colorTextBase, fontSize: 14 }} numberOfLines={3}>
                        {row.description}
                      </Text>
                    ) : null}
                    <View style={styles.metaRow}>
                      <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>
                        {t('clinical.source', { source: formatRecordSource(row.source) })}
                      </Text>
                      {amount ? <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>{amount}</Text> : null}
                    </View>
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>{t('clinical.records.tapToEdit')}</Text>
                  </Pressable>
                )
              })}
            </View>
          </SectionCard>
        )}
      </ScrollView>

      <FormSheet
        visible={sheetOpen}
        title={editing ? t('clinical.records.editTitle') : t('clinical.records.addTitle')}
        onClose={closeSheet}
        onSave={() => void save()}
        saving={saving}
      >
        <View>
          <Text style={{ color: tokens.colorTextBase, fontWeight: '600', fontSize: 14, marginBottom: 6 }}>
            {t('clinical.records.fieldDate')} *
          </Text>
          <MaskedField
            tokens={tokens}
            value={recordDateBr}
            onChangeText={setRecordDateBr}
            format={formatDateBrInput}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
          />
        </View>

        <Text style={{ color: tokens.colorTextBase, fontWeight: '600', fontSize: 14 }}>
          {t('clinical.records.fieldType')} *
        </Text>
        <View style={styles.typeRow}>
          {MEDICAL_RECORD_TYPES.map((opt) => {
            const active = recordType === opt
            return (
              <Pressable
                key={opt}
                onPress={() => setRecordType(opt)}
                style={[
                  styles.typeChip,
                  {
                    borderColor: active ? tokens.colorPrimary : tokens.colorBorder,
                    backgroundColor: active ? tokens.colorBgLayout : tokens.colorBgContainer,
                  },
                ]}
              >
                <Text style={{ color: active ? tokens.colorPrimary : tokens.colorTextSecondary, fontSize: 12 }}>
                  {t(`clinical.records.type_${opt.replace(/-/g, '_')}`)}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <FormField
          tokens={tokens}
          label={t('clinical.records.fieldDescription')}
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <FormField tokens={tokens} label={t('clinical.records.fieldDoctor')} value={doctorName} onChangeText={setDoctorName} />
        <FormField tokens={tokens} label={t('clinical.records.fieldSpecialty')} value={specialty} onChangeText={setSpecialty} />
        <FormField tokens={tokens} label={t('clinical.records.fieldClinic')} value={clinicName} onChangeText={setClinicName} />

        {editing ? (
          <Pressable onPress={confirmDelete} style={[styles.deleteBtn, { borderColor: tokens.colorError }]}>
            <Text style={{ color: tokens.colorError, fontWeight: '600', textAlign: 'center' }}>
              {t('clinical.records.deleteConfirm')}
            </Text>
          </Pressable>
        ) : null}
      </FormSheet>
    </>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  primaryBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryBtnLabel: { color: '#fff', fontWeight: '700', fontSize: 16 },
  webHint: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  list: { gap: 10 },
  row: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
  itemName: { fontSize: 16, fontWeight: '600', flex: 1 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 4 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  deleteBtn: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 8 },
})
