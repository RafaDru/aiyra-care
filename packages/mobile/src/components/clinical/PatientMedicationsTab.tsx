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
import type { Medication } from '@/lib/api.types'
import {
  formatClinicalDate,
  medicationDisplayName,
  medicationSubtitle,
} from '@/lib/clinical-format'
import { formatDateBrInput, isoDateToBrInput, parseDateBrToIso } from '@/lib/input-masks'
import { buildMedicationPayload } from '@/lib/medication-duration'
import { webPatientSectionTabUrl } from '@/lib/web-app-url'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = { patientId: string }

function sortMedications(rows: Medication[]): Medication[] {
  return [...rows].sort((a, b) => {
    const anchor = (m: Medication) => m.startedAt ?? m.startDate ?? m.createdAt
    const ta = new Date(anchor(a)).getTime()
    const tb = new Date(anchor(b)).getTime()
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta)
  })
}

export function PatientMedicationsTab({ patientId }: Props) {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const { tokens } = useAiyraTheme()
  const [medications, setMedications] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Medication | null>(null)
  const [genericName, setGenericName] = useState('')
  const [brandName, setBrandName] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('')
  const [route, setRoute] = useState('')
  const [duration, setDuration] = useState('')
  const [startDateBr, setStartDateBr] = useState('')
  const [endDateBr, setEndDateBr] = useState('')
  const [prescribingDoctor, setPrescribingDoctor] = useState('')
  const [notes, setNotes] = useState('')
  const [isActive, setIsActive] = useState(true)

  const load = useCallback(async () => {
    setError(null)
    try {
      setMedications(await api.medications.list(patientId))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('clinical.medications.loadError'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [patientId, t])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const sorted = useMemo(() => sortMedications(medications), [medications])
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR'
  const openWeb = () => void Linking.openURL(webPatientSectionTabUrl(patientId, 'clinical', 'medications'))

  const resetForm = () => {
    setEditing(null)
    setGenericName('')
    setBrandName('')
    setDosage('')
    setFrequency('')
    setRoute('')
    setDuration('')
    setStartDateBr('')
    setEndDateBr('')
    setPrescribingDoctor('')
    setNotes('')
    setIsActive(true)
  }

  const openCreate = () => {
    resetForm()
    setSheetOpen(true)
  }

  const openEdit = (med: Medication) => {
    setEditing(med)
    setGenericName(med.genericName)
    setBrandName(med.brandName ?? '')
    setDosage(med.dosage ?? '')
    setFrequency(med.frequency ?? '')
    setRoute(med.route ?? '')
    setDuration(med.duration ?? '')
    setStartDateBr(isoDateToBrInput(med.startDate ?? med.startedAt))
    setEndDateBr(isoDateToBrInput(med.endDate))
    setPrescribingDoctor(med.prescribingDoctor ?? '')
    setNotes(med.notes ?? '')
    setIsActive(med.isActive)
    setSheetOpen(true)
  }

  const closeSheet = () => {
    setSheetOpen(false)
    resetForm()
  }

  const save = async () => {
    if (!genericName.trim()) {
      toast.info(t('clinical.medications.genericRequired'))
      return
    }
    let startDateIso: string | undefined
    if (startDateBr.trim()) {
      const parsed = parseDateBrToIso(startDateBr)
      if (!parsed) {
        toast.info(t('clinical.medications.invalidStartDate'))
        return
      }
      startDateIso = parsed
    }
    let endDateIso: string | undefined
    let endDateIsProjected = editing?.endDateIsProjected ?? false
    if (endDateBr.trim()) {
      const parsed = parseDateBrToIso(endDateBr)
      if (!parsed) {
        toast.info(t('clinical.medications.invalidEndDate'))
        return
      }
      endDateIso = parsed
      endDateIsProjected = false
    }
    const payload = buildMedicationPayload({
      genericName,
      brandName,
      dosage,
      frequency,
      route,
      duration,
      startDateIso,
      endDateIso,
      endDateIsProjectedInput: endDateIsProjected,
      prescribingDoctor,
      notes,
      isActive,
    })
    setSaving(true)
    try {
      if (editing) {
        await api.medications.update(editing.id, payload)
        toast.success(t('clinical.medications.updated'))
      } else {
        await api.medications.create({ patientId, ...payload, isActive: payload.isActive ?? true })
        toast.success(t('clinical.medications.created'))
      }
      closeSheet()
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('clinical.medications.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = () => {
    if (!editing) return
    Alert.alert(t('clinical.medications.deleteTitle'), t('clinical.medications.deleteMessage'), [
      { text: t('clinical.medications.cancel'), style: 'cancel' },
      {
        text: t('clinical.medications.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setSaving(true)
            try {
              await api.medications.delete(editing.id)
              toast.success(t('clinical.medications.deleted'))
              closeSheet()
              await load()
            } catch (err) {
              toast.error(err instanceof Error ? err.message : t('clinical.medications.saveError'))
            } finally {
              setSaving(false)
            }
          })()
        },
      },
    ])
  }

  if (loading && medications.length === 0 && !error) return <StatePanel tokens={tokens} loading />
  if (error && medications.length === 0) return <StatePanel tokens={tokens} error={error} onRetry={() => void load()} />

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
          <Text style={[styles.title, { color: tokens.colorTextBase }]}>{t('clinical.medications.title')}</Text>
          <Text style={{ color: tokens.colorTextSecondary, fontSize: 14 }}>{t('clinical.medications.subtitleTx')}</Text>
        </View>

        <Pressable onPress={openCreate} style={[styles.primaryBtn, { backgroundColor: tokens.colorPrimary }]}>
          <Text style={styles.primaryBtnLabel}>{t('clinical.medications.add')}</Text>
        </Pressable>

        <Pressable
          onPress={openWeb}
          style={[styles.webHint, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
        >
          <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>{t('clinical.medications.webHintTx')}</Text>
          <Text style={{ color: tokens.colorPrimary, fontWeight: '600', fontSize: 14 }}>
            {t('clinical.medications.openWeb')}
          </Text>
        </Pressable>

        {sorted.length === 0 ? (
          <SectionCard title={t('clinical.listTitle')}>
            <Text style={{ color: tokens.colorTextSecondary }}>{t('clinical.medications.empty')}</Text>
          </SectionCard>
        ) : (
          <SectionCard title={t('clinical.medications.listCount', { count: sorted.length })}>
            <View style={styles.list}>
              {sorted.map((med) => {
                const subtitle = medicationSubtitle(med)
                const start = med.startedAt ?? med.startDate
                const end = med.endDate
                return (
                  <Pressable
                    key={med.id}
                    onPress={() => openEdit(med)}
                    style={[styles.row, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
                  >
                    <View style={styles.rowHeader}>
                      <Text style={[styles.itemName, { color: tokens.colorTextBase }]} numberOfLines={2}>
                        {medicationDisplayName(med.genericName, med.brandName)}
                      </Text>
                      <Text
                        style={[
                          styles.statusBadge,
                          {
                            color: med.isActive ? tokens.colorSuccess : tokens.colorTextSecondary,
                            borderColor: med.isActive ? tokens.colorSuccess : tokens.colorBorder,
                          },
                        ]}
                      >
                        {med.isActive ? t('clinical.medications.active') : t('clinical.medications.inactive')}
                      </Text>
                    </View>
                    {subtitle ? (
                      <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }} numberOfLines={2}>
                        {subtitle}
                      </Text>
                    ) : null}
                    {start || end ? (
                      <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>
                        {start ? formatClinicalDate(start, locale) : '—'}
                        {end
                          ? ` → ${formatClinicalDate(end, locale)}${med.endDateIsProjected ? ` (${t('clinical.medications.projected')})` : ''}`
                          : ''}
                      </Text>
                    ) : null}
                    {med.prescribingDoctor ? (
                      <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }} numberOfLines={1}>
                        {t('clinical.medications.prescriber', { name: med.prescribingDoctor })}
                      </Text>
                    ) : null}
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>{t('clinical.medications.tapToEdit')}</Text>
                  </Pressable>
                )
              })}
            </View>
          </SectionCard>
        )}
      </ScrollView>

      <FormSheet
        visible={sheetOpen}
        title={editing ? t('clinical.medications.editTitle') : t('clinical.medications.addTitle')}
        onClose={closeSheet}
        onSave={() => void save()}
        saving={saving}
      >
        <FormField
          tokens={tokens}
          label={`${t('clinical.medications.fieldGeneric')} *`}
          value={genericName}
          onChangeText={setGenericName}
        />
        <FormField tokens={tokens} label={t('clinical.medications.fieldBrand')} value={brandName} onChangeText={setBrandName} />
        <FormField tokens={tokens} label={t('clinical.medications.fieldDosage')} value={dosage} onChangeText={setDosage} />
        <FormField tokens={tokens} label={t('clinical.medications.fieldFrequency')} value={frequency} onChangeText={setFrequency} />
        <FormField tokens={tokens} label={t('clinical.medications.fieldRoute')} value={route} onChangeText={setRoute} />
        <FormField
          tokens={tokens}
          label={t('clinical.medications.fieldDuration')}
          value={duration}
          onChangeText={setDuration}
          placeholder="5 dias, 2 semanas…"
        />
        <View>
          <Text style={{ color: tokens.colorTextBase, fontWeight: '600', fontSize: 14, marginBottom: 6 }}>
            {t('clinical.medications.fieldStartDate')}
          </Text>
          <MaskedField
            tokens={tokens}
            value={startDateBr}
            onChangeText={setStartDateBr}
            format={formatDateBrInput}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
          />
        </View>
        <View>
          <Text style={{ color: tokens.colorTextBase, fontWeight: '600', fontSize: 14, marginBottom: 6 }}>
            {t('clinical.medications.fieldEndDate')}
          </Text>
          <MaskedField
            tokens={tokens}
            value={endDateBr}
            onChangeText={setEndDateBr}
            format={formatDateBrInput}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
          />
        </View>
        <FormField
          tokens={tokens}
          label={t('clinical.medications.fieldDoctor')}
          value={prescribingDoctor}
          onChangeText={setPrescribingDoctor}
        />
        <FormField tokens={tokens} label={t('clinical.medications.fieldNotes')} value={notes} onChangeText={setNotes} multiline />

        <Text style={{ color: tokens.colorTextBase, fontWeight: '600', fontSize: 14 }}>
          {t('clinical.medications.fieldActive')}
        </Text>
        <View style={styles.activeRow}>
          <Pressable
            onPress={() => setIsActive(true)}
            style={[
              styles.activeChip,
              {
                borderColor: isActive ? tokens.colorSuccess : tokens.colorBorder,
                backgroundColor: isActive ? tokens.colorBgLayout : tokens.colorBgContainer,
              },
            ]}
          >
            <Text style={{ color: isActive ? tokens.colorSuccess : tokens.colorTextSecondary }}>
              {t('clinical.medications.active')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setIsActive(false)}
            style={[
              styles.activeChip,
              {
                borderColor: !isActive ? tokens.colorTextSecondary : tokens.colorBorder,
                backgroundColor: !isActive ? tokens.colorBgLayout : tokens.colorBgContainer,
              },
            ]}
          >
            <Text style={{ color: !isActive ? tokens.colorTextBase : tokens.colorTextSecondary }}>
              {t('clinical.medications.inactive')}
            </Text>
          </Pressable>
        </View>

        {editing ? (
          <Pressable onPress={confirmDelete} style={[styles.deleteBtn, { borderColor: tokens.colorError }]}>
            <Text style={{ color: tokens.colorError, fontWeight: '600', textAlign: 'center' }}>
              {t('clinical.medications.deleteConfirm')}
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
  rowHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, justifyContent: 'space-between' },
  itemName: { fontSize: 16, fontWeight: '600', flex: 1 },
  statusBadge: {
    fontSize: 11,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeRow: { flexDirection: 'row', gap: 8 },
  activeChip: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  deleteBtn: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 8 },
})
