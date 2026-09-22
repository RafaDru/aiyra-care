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
import type { Diagnosis } from '@/lib/api.types'
import { formatClinicalDate } from '@/lib/clinical-format'
import { formatDateBrInput, isoDateToBrInput, parseDateBrToIso } from '@/lib/input-masks'
import { webPatientSectionTabUrl } from '@/lib/web-app-url'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = { patientId: string }

type DiagnosisStatus = 'active' | 'resolved' | 'monitoring'

const STATUS_OPTIONS: DiagnosisStatus[] = ['active', 'resolved', 'monitoring']

function sortDiagnoses(rows: Diagnosis[]): Diagnosis[] {
  return [...rows].sort((a, b) => a.diagnosisName.localeCompare(b.diagnosisName, 'pt-BR'))
}

function diagnosisStatusKey(status: string | null): DiagnosisStatus | null {
  if (status === 'active' || status === 'resolved' || status === 'monitoring') return status
  return null
}

export function PatientDiagnosesTab({ patientId }: Props) {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const { tokens } = useAiyraTheme()
  const [rows, setRows] = useState<Diagnosis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Diagnosis | null>(null)
  const [diagnosisName, setDiagnosisName] = useState('')
  const [diagnosisCode, setDiagnosisCode] = useState('')
  const [description, setDescription] = useState('')
  const [isChronic, setIsChronic] = useState(false)
  const [diagnosedDateBr, setDiagnosedDateBr] = useState('')
  const [status, setStatus] = useState<DiagnosisStatus | null>('active')

  const load = useCallback(async () => {
    setError(null)
    try {
      setRows(await api.diagnoses.list(patientId))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('clinical.diagnoses.loadError'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [patientId, t])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const sorted = useMemo(() => sortDiagnoses(rows), [rows])
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR'
  const openWeb = () => void Linking.openURL(webPatientSectionTabUrl(patientId, 'clinical', 'diagnoses'))

  const resetForm = () => {
    setEditing(null)
    setDiagnosisName('')
    setDiagnosisCode('')
    setDescription('')
    setIsChronic(false)
    setDiagnosedDateBr('')
    setStatus('active')
  }

  const openCreate = () => {
    resetForm()
    setSheetOpen(true)
  }

  const openEdit = (row: Diagnosis) => {
    setEditing(row)
    setDiagnosisName(row.diagnosisName)
    setDiagnosisCode(row.diagnosisCode ?? '')
    setDescription(row.description ?? '')
    setIsChronic(row.isChronic)
    setDiagnosedDateBr(isoDateToBrInput(row.diagnosedDate))
    setStatus(diagnosisStatusKey(row.status) ?? null)
    setSheetOpen(true)
  }

  const closeSheet = () => {
    setSheetOpen(false)
    resetForm()
  }

  const save = async () => {
    const name = diagnosisName.trim()
    if (!name) {
      toast.info(t('clinical.diagnoses.nameRequired'))
      return
    }
    if (diagnosisCode.trim().length > 20) {
      toast.info(t('clinical.diagnoses.codeTooLong'))
      return
    }
    let diagnosedIso: string | undefined
    if (diagnosedDateBr.trim()) {
      const parsed = parseDateBrToIso(diagnosedDateBr)
      if (!parsed) {
        toast.info(t('clinical.diagnoses.invalidDate'))
        return
      }
      diagnosedIso = parsed
    }
    const payload = {
      diagnosisName: name,
      diagnosisCode: diagnosisCode.trim() || undefined,
      description: description.trim() || undefined,
      isChronic,
      diagnosedDate: diagnosedIso,
      status: status ?? undefined,
    }
    setSaving(true)
    try {
      if (editing) {
        await api.diagnoses.update(editing.id, payload)
        toast.success(t('clinical.diagnoses.updated'))
      } else {
        await api.diagnoses.create({ patientId, ...payload })
        toast.success(t('clinical.diagnoses.created'))
      }
      closeSheet()
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('clinical.diagnoses.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = () => {
    if (!editing) return
    Alert.alert(t('clinical.diagnoses.deleteTitle'), t('clinical.diagnoses.deleteMessage'), [
      { text: t('clinical.diagnoses.cancel'), style: 'cancel' },
      {
        text: t('clinical.diagnoses.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setSaving(true)
            try {
              await api.diagnoses.delete(editing.id)
              toast.success(t('clinical.diagnoses.deleted'))
              closeSheet()
              await load()
            } catch (err) {
              toast.error(err instanceof Error ? err.message : t('clinical.diagnoses.saveError'))
            } finally {
              setSaving(false)
            }
          })()
        },
      },
    ])
  }

  const statusLabel = (raw: string | null) => {
    const key = diagnosisStatusKey(raw)
    if (key) return t(`clinical.diagnoses.status_${key}`)
    return raw
  }

  if (loading && rows.length === 0 && !error) return <StatePanel tokens={tokens} loading />
  if (error && rows.length === 0) return <StatePanel tokens={tokens} error={error} onRetry={() => void load()} />

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
          <Text style={[styles.title, { color: tokens.colorTextBase }]}>{t('clinical.diagnoses.title')}</Text>
          <Text style={{ color: tokens.colorTextSecondary, fontSize: 14 }}>{t('clinical.diagnoses.subtitleTx')}</Text>
        </View>

        <Pressable onPress={openCreate} style={[styles.primaryBtn, { backgroundColor: tokens.colorPrimary }]}>
          <Text style={styles.primaryBtnLabel}>{t('clinical.diagnoses.add')}</Text>
        </Pressable>

        <Pressable
          onPress={openWeb}
          style={[styles.webHint, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
        >
          <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>{t('clinical.diagnoses.webHintTx')}</Text>
          <Text style={{ color: tokens.colorPrimary, fontWeight: '600' }}>{t('clinical.diagnoses.openWeb')}</Text>
        </Pressable>

        {sorted.length === 0 ? (
          <SectionCard title={t('clinical.listTitle')}>
            <Text style={{ color: tokens.colorTextSecondary }}>{t('clinical.diagnoses.empty')}</Text>
          </SectionCard>
        ) : (
          <SectionCard title={t('clinical.diagnoses.listCount', { count: sorted.length })}>
            <View style={styles.list}>
              {sorted.map((row) => (
                <Pressable
                  key={row.id}
                  onPress={() => openEdit(row)}
                  style={[styles.row, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
                >
                  <Text style={[styles.itemName, { color: tokens.colorTextBase }]} numberOfLines={2}>
                    {row.diagnosisName}
                  </Text>
                  {row.diagnosisCode ? (
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>{row.diagnosisCode}</Text>
                  ) : null}
                  <View style={styles.badges}>
                    {row.isChronic ? (
                      <Text style={[styles.badge, { borderColor: tokens.colorError, color: tokens.colorError }]}>
                        {t('clinical.diagnoses.chronic')}
                      </Text>
                    ) : null}
                    {row.status ? (
                      <Text style={[styles.badge, { borderColor: tokens.colorBorder, color: tokens.colorTextSecondary }]}>
                        {statusLabel(row.status)}
                      </Text>
                    ) : null}
                  </View>
                  {row.diagnosedDate ? (
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>
                      {formatClinicalDate(row.diagnosedDate, locale)}
                    </Text>
                  ) : null}
                  {row.description ? (
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }} numberOfLines={3}>
                      {row.description}
                    </Text>
                  ) : null}
                  <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>{t('clinical.diagnoses.tapToEdit')}</Text>
                </Pressable>
              ))}
            </View>
          </SectionCard>
        )}
      </ScrollView>

      <FormSheet
        visible={sheetOpen}
        title={editing ? t('clinical.diagnoses.editTitle') : t('clinical.diagnoses.addTitle')}
        onClose={closeSheet}
        onSave={() => void save()}
        saving={saving}
      >
        <FormField
          tokens={tokens}
          label={`${t('clinical.diagnoses.fieldName')} *`}
          value={diagnosisName}
          onChangeText={setDiagnosisName}
        />
        <FormField
          tokens={tokens}
          label={t('clinical.diagnoses.fieldCode')}
          value={diagnosisCode}
          onChangeText={setDiagnosisCode}
          placeholder="H66.9"
        />
        <FormField
          tokens={tokens}
          label={t('clinical.diagnoses.fieldDescription')}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text style={{ color: tokens.colorTextBase, fontWeight: '600', fontSize: 14, marginBottom: 6 }}>
          {t('clinical.diagnoses.fieldChronic')}
        </Text>
        <View style={styles.chipRow}>
          <Pressable
            onPress={() => setIsChronic(true)}
            style={[
              styles.chip,
              {
                borderColor: isChronic ? tokens.colorError : tokens.colorBorder,
                backgroundColor: isChronic ? tokens.colorBgLayout : tokens.colorBgContainer,
              },
            ]}
          >
            <Text style={{ color: isChronic ? tokens.colorError : tokens.colorTextSecondary }}>
              {t('clinical.diagnoses.chronicYes')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setIsChronic(false)}
            style={[
              styles.chip,
              {
                borderColor: !isChronic ? tokens.colorPrimary : tokens.colorBorder,
                backgroundColor: !isChronic ? tokens.colorBgLayout : tokens.colorBgContainer,
              },
            ]}
          >
            <Text style={{ color: !isChronic ? tokens.colorPrimary : tokens.colorTextSecondary }}>
              {t('clinical.diagnoses.chronicNo')}
            </Text>
          </Pressable>
        </View>

        <View>
          <Text style={{ color: tokens.colorTextBase, fontWeight: '600', fontSize: 14, marginBottom: 6 }}>
            {t('clinical.diagnoses.fieldDate')}
          </Text>
          <MaskedField
            tokens={tokens}
            value={diagnosedDateBr}
            onChangeText={setDiagnosedDateBr}
            format={formatDateBrInput}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
          />
        </View>

        <Text style={{ color: tokens.colorTextBase, fontWeight: '600', fontSize: 14, marginBottom: 6 }}>
          {t('clinical.diagnoses.fieldStatus')}
        </Text>
        <View style={styles.chipRow}>
          {STATUS_OPTIONS.map((opt) => {
            const active = status === opt
            return (
              <Pressable
                key={opt}
                onPress={() => setStatus(opt)}
                style={[
                  styles.chip,
                  {
                    borderColor: active ? tokens.colorPrimary : tokens.colorBorder,
                    backgroundColor: active ? tokens.colorBgLayout : tokens.colorBgContainer,
                  },
                ]}
              >
                <Text style={{ color: active ? tokens.colorPrimary : tokens.colorTextBase, fontSize: 13, fontWeight: '600' }}>
                  {t(`clinical.diagnoses.status_${opt}`)}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <Pressable onPress={() => setStatus(null)} style={{ marginBottom: 8 }}>
          <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>{t('clinical.diagnoses.statusClear')}</Text>
        </Pressable>

        {editing ? (
          <Pressable onPress={confirmDelete} style={[styles.deleteBtn, { borderColor: tokens.colorError }]}>
            <Text style={{ color: tokens.colorError, fontWeight: '600', textAlign: 'center' }}>
              {t('clinical.diagnoses.deleteConfirm')}
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
  itemName: { fontSize: 16, fontWeight: '600' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { fontSize: 11, fontWeight: '600', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  deleteBtn: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 8 },
})
