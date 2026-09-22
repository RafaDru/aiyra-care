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
import type { Vaccine } from '@/lib/api.types'
import { formatClinicalDate, formatVaccineSource } from '@/lib/clinical-format'
import { formatDateBrInput, isoDateToBrInput, parseDateBrToIso } from '@/lib/input-masks'
import { webPatientSectionTabUrl } from '@/lib/web-app-url'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = { patientId: string }

function sortVaccinesNewestFirst(rows: Vaccine[]): Vaccine[] {
  return [...rows].sort((a, b) => {
    const ta = new Date(a.applicationDate).getTime()
    const tb = new Date(b.applicationDate).getTime()
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta)
  })
}

function parseDoseNumber(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const n = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(n) || n < 1) return undefined
  return n
}

export function PatientVaccinesTab({ patientId }: Props) {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const { tokens } = useAiyraTheme()
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Vaccine | null>(null)
  const [vaccineName, setVaccineName] = useState('')
  const [doseNumber, setDoseNumber] = useState('')
  const [applicationDateBr, setApplicationDateBr] = useState('')
  const [nextDoseDateBr, setNextDoseDateBr] = useState('')
  const [appliedBy, setAppliedBy] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [clinic, setClinic] = useState('')
  const [notes, setNotes] = useState('')

  const load = useCallback(async () => {
    setError(null)
    try {
      setVaccines(await api.vaccines.list(patientId))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('clinical.vaccines.loadError'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [patientId, t])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const sorted = useMemo(() => sortVaccinesNewestFirst(vaccines), [vaccines])
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR'
  const openWeb = () => void Linking.openURL(webPatientSectionTabUrl(patientId, 'clinical', 'vaccines'))

  const resetForm = () => {
    setEditing(null)
    setVaccineName('')
    setDoseNumber('')
    setApplicationDateBr('')
    setNextDoseDateBr('')
    setAppliedBy('')
    setBatchNumber('')
    setClinic('')
    setNotes('')
  }

  const openCreate = () => {
    resetForm()
    setSheetOpen(true)
  }

  const openEdit = (v: Vaccine) => {
    setEditing(v)
    setVaccineName(v.vaccineName)
    setDoseNumber(v.doseNumber != null ? String(v.doseNumber) : '')
    setApplicationDateBr(isoDateToBrInput(v.applicationDate))
    setNextDoseDateBr(isoDateToBrInput(v.nextDoseDate))
    setAppliedBy(v.appliedBy ?? '')
    setBatchNumber(v.batchNumber ?? '')
    setClinic(v.clinic ?? '')
    setNotes(v.notes ?? '')
    setSheetOpen(true)
  }

  const closeSheet = () => {
    setSheetOpen(false)
    resetForm()
  }

  const save = async () => {
    const name = vaccineName.trim()
    if (!name) {
      toast.info(t('clinical.vaccines.nameRequired'))
      return
    }
    const applicationIso = parseDateBrToIso(applicationDateBr)
    if (!applicationIso) {
      toast.info(t('clinical.vaccines.invalidApplicationDate'))
      return
    }
    let nextDoseIso: string | undefined
    if (nextDoseDateBr.trim()) {
      const parsed = parseDateBrToIso(nextDoseDateBr)
      if (!parsed) {
        toast.info(t('clinical.vaccines.invalidNextDoseDate'))
        return
      }
      nextDoseIso = parsed
    }
    const dose = parseDoseNumber(doseNumber)
    if (doseNumber.trim() && dose === undefined) {
      toast.info(t('clinical.vaccines.invalidDose'))
      return
    }
    const payload = {
      vaccineName: name,
      applicationDate: applicationIso,
      doseNumber: dose,
      batchNumber: batchNumber.trim() || undefined,
      nextDoseDate: nextDoseIso,
      appliedBy: appliedBy.trim() || undefined,
      clinic: clinic.trim() || undefined,
      notes: notes.trim() || undefined,
    }
    setSaving(true)
    try {
      if (editing) {
        await api.vaccines.update(editing.id, payload)
        toast.success(t('clinical.vaccines.updated'))
      } else {
        await api.vaccines.create({ patientId, ...payload, source: 'manual' })
        toast.success(t('clinical.vaccines.created'))
      }
      closeSheet()
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('clinical.vaccines.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = () => {
    if (!editing) return
    Alert.alert(t('clinical.vaccines.deleteTitle'), t('clinical.vaccines.deleteMessage'), [
      { text: t('clinical.vaccines.cancel'), style: 'cancel' },
      {
        text: t('clinical.vaccines.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setSaving(true)
            try {
              await api.vaccines.delete(editing.id)
              toast.success(t('clinical.vaccines.deleted'))
              closeSheet()
              await load()
            } catch (err) {
              toast.error(err instanceof Error ? err.message : t('clinical.vaccines.saveError'))
            } finally {
              setSaving(false)
            }
          })()
        },
      },
    ])
  }

  if (loading && vaccines.length === 0 && !error) return <StatePanel tokens={tokens} loading />
  if (error && vaccines.length === 0) return <StatePanel tokens={tokens} error={error} onRetry={() => void load()} />

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
          <Text style={[styles.title, { color: tokens.colorTextBase }]}>{t('clinical.vaccines.title')}</Text>
          <Text style={{ color: tokens.colorTextSecondary, fontSize: 14 }}>{t('clinical.vaccines.subtitleTx')}</Text>
        </View>

        <Pressable onPress={openCreate} style={[styles.primaryBtn, { backgroundColor: tokens.colorPrimary }]}>
          <Text style={styles.primaryBtnLabel}>{t('clinical.vaccines.add')}</Text>
        </Pressable>

        <Pressable
          onPress={openWeb}
          style={[styles.webHint, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
        >
          <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>{t('clinical.vaccines.webHintTx')}</Text>
          <Text style={{ color: tokens.colorPrimary, fontWeight: '600', fontSize: 14 }}>
            {t('clinical.vaccines.openWeb')}
          </Text>
        </Pressable>

        {sorted.length === 0 ? (
          <SectionCard title={t('clinical.listTitle')}>
            <Text style={{ color: tokens.colorTextSecondary }}>{t('clinical.vaccines.empty')}</Text>
          </SectionCard>
        ) : (
          <SectionCard title={t('clinical.vaccines.listCount', { count: sorted.length })}>
            <View style={styles.list}>
              {sorted.map((vaccine) => (
                <Pressable
                  key={vaccine.id}
                  onPress={() => openEdit(vaccine)}
                  style={[styles.row, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
                >
                  <Text style={[styles.itemName, { color: tokens.colorTextBase }]} numberOfLines={2}>
                    {vaccine.vaccineName}
                    {vaccine.doseNumber != null
                      ? ` · ${t('clinical.vaccines.doseShort', { dose: vaccine.doseNumber })}`
                      : ''}
                  </Text>
                  <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>
                    {formatClinicalDate(vaccine.applicationDate, locale)}
                    {vaccine.clinic ? ` · ${vaccine.clinic}` : ''}
                  </Text>
                  {vaccine.nextDoseDate ? (
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>
                      {t('clinical.vaccines.nextDose', { date: formatClinicalDate(vaccine.nextDoseDate, locale) })}
                    </Text>
                  ) : null}
                  {vaccine.batchNumber ? (
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>
                      {t('clinical.vaccines.batch', { batch: vaccine.batchNumber })}
                    </Text>
                  ) : null}
                  {vaccine.appliedBy ? (
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }} numberOfLines={1}>
                      {t('clinical.vaccines.appliedBy', { name: vaccine.appliedBy })}
                    </Text>
                  ) : null}
                  <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>
                    {t('clinical.source', { source: formatVaccineSource(vaccine.source) })}
                  </Text>
                  <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>{t('clinical.vaccines.tapToEdit')}</Text>
                </Pressable>
              ))}
            </View>
          </SectionCard>
        )}
      </ScrollView>

      <FormSheet
        visible={sheetOpen}
        title={editing ? t('clinical.vaccines.editTitle') : t('clinical.vaccines.addTitle')}
        onClose={closeSheet}
        onSave={() => void save()}
        saving={saving}
      >
        <FormField
          tokens={tokens}
          label={`${t('clinical.vaccines.fieldName')} *`}
          value={vaccineName}
          onChangeText={setVaccineName}
        />
        <FormField
          tokens={tokens}
          label={t('clinical.vaccines.fieldDose')}
          value={doseNumber}
          onChangeText={setDoseNumber}
          keyboardType="number-pad"
        />
        <View>
          <Text style={{ color: tokens.colorTextBase, fontWeight: '600', fontSize: 14, marginBottom: 6 }}>
            {t('clinical.vaccines.fieldApplicationDate')} *
          </Text>
          <MaskedField
            tokens={tokens}
            value={applicationDateBr}
            onChangeText={setApplicationDateBr}
            format={formatDateBrInput}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
          />
        </View>
        <View>
          <Text style={{ color: tokens.colorTextBase, fontWeight: '600', fontSize: 14, marginBottom: 6 }}>
            {t('clinical.vaccines.fieldNextDose')}
          </Text>
          <MaskedField
            tokens={tokens}
            value={nextDoseDateBr}
            onChangeText={setNextDoseDateBr}
            format={formatDateBrInput}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
          />
        </View>
        <FormField tokens={tokens} label={t('clinical.vaccines.fieldAppliedBy')} value={appliedBy} onChangeText={setAppliedBy} />
        <FormField tokens={tokens} label={t('clinical.vaccines.fieldBatch')} value={batchNumber} onChangeText={setBatchNumber} />
        <FormField tokens={tokens} label={t('clinical.vaccines.fieldClinic')} value={clinic} onChangeText={setClinic} />
        <FormField tokens={tokens} label={t('clinical.vaccines.fieldNotes')} value={notes} onChangeText={setNotes} multiline />

        {editing ? (
          <Pressable onPress={confirmDelete} style={[styles.deleteBtn, { borderColor: tokens.colorError }]}>
            <Text style={{ color: tokens.colorError, fontWeight: '600', textAlign: 'center' }}>
              {t('clinical.vaccines.deleteConfirm')}
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
  deleteBtn: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 8 },
})
