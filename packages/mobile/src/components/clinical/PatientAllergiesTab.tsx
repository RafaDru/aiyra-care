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
import type { Allergy } from '@/lib/api.types'
import { allergySeverityKey, formatClinicalDate } from '@/lib/clinical-format'
import { formatDateBrInput, parseDateBrToIso } from '@/lib/input-masks'
import { webPatientSectionTabUrl } from '@/lib/web-app-url'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = { patientId: string }

type Severity = 'mild' | 'moderate' | 'severe'

function sortAllergies(rows: Allergy[]): Allergy[] {
  return [...rows].sort((a, b) => a.allergen.localeCompare(b.allergen, 'pt-BR'))
}

function isoToBr(iso: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  } catch {
    return ''
  }
}

export function PatientAllergiesTab({ patientId }: Props) {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const { tokens } = useAiyraTheme()
  const [allergies, setAllergies] = useState<Allergy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Allergy | null>(null)
  const [allergen, setAllergen] = useState('')
  const [reaction, setReaction] = useState('')
  const [severity, setSeverity] = useState<Severity | null>(null)
  const [diagnosedBr, setDiagnosedBr] = useState('')
  const [notes, setNotes] = useState('')

  const load = useCallback(async () => {
    setError(null)
    try {
      setAllergies(await api.allergies.list(patientId))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('clinical.allergies.loadError'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [patientId, t])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const sorted = useMemo(() => sortAllergies(allergies), [allergies])
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR'

  const openWeb = () => void Linking.openURL(webPatientSectionTabUrl(patientId, 'clinical', 'allergies'))

  const resetForm = () => {
    setEditing(null)
    setAllergen('')
    setReaction('')
    setSeverity(null)
    setDiagnosedBr('')
    setNotes('')
  }

  const openCreate = () => {
    resetForm()
    setSheetOpen(true)
  }

  const openEdit = (row: Allergy) => {
    setEditing(row)
    setAllergen(row.allergen)
    setReaction(row.reaction ?? '')
    setSeverity((allergySeverityKey(row.severity) as Severity | null) ?? null)
    setDiagnosedBr(isoToBr(row.diagnosedDate))
    setNotes(row.notes ?? '')
    setSheetOpen(true)
  }

  const closeSheet = () => {
    setSheetOpen(false)
    resetForm()
  }

  const save = async () => {
    const name = allergen.trim()
    if (!name) {
      toast.info(t('clinical.allergies.allergenRequired'))
      return
    }
    let diagnosedIso: string | undefined
    if (diagnosedBr.trim()) {
      const parsed = parseDateBrToIso(diagnosedBr)
      if (!parsed) {
        toast.info(t('clinical.allergies.invalidDate'))
        return
      }
      diagnosedIso = parsed
    }
    setSaving(true)
    try {
      const payload = {
        allergen: name,
        reaction: reaction.trim() || undefined,
        severity: severity ?? undefined,
        diagnosedDate: diagnosedIso,
        notes: notes.trim() || undefined,
      }
      if (editing) {
        await api.allergies.update(editing.id, payload)
        toast.success(t('clinical.allergies.updated'))
      } else {
        await api.allergies.create({ patientId, ...payload })
        toast.success(t('clinical.allergies.created'))
      }
      closeSheet()
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('clinical.allergies.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = () => {
    if (!editing) return
    Alert.alert(t('clinical.allergies.deleteTitle'), t('clinical.allergies.deleteMessage'), [
      { text: t('clinical.allergies.cancel'), style: 'cancel' },
      {
        text: t('clinical.allergies.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setSaving(true)
            try {
              await api.allergies.delete(editing.id)
              toast.success(t('clinical.allergies.deleted'))
              closeSheet()
              await load()
            } catch (err) {
              toast.error(err instanceof Error ? err.message : t('clinical.allergies.saveError'))
            } finally {
              setSaving(false)
            }
          })()
        },
      },
    ])
  }

  const severityOptions: Severity[] = ['mild', 'moderate', 'severe']

  if (loading && allergies.length === 0 && !error) return <StatePanel tokens={tokens} loading />
  if (error && allergies.length === 0) return <StatePanel tokens={tokens} error={error} onRetry={() => void load()} />

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
          <Text style={[styles.title, { color: tokens.colorTextBase }]}>{t('clinical.allergies.title')}</Text>
          <Text style={{ color: tokens.colorTextSecondary, fontSize: 14 }}>{t('clinical.allergies.subtitleTx')}</Text>
        </View>

        <Pressable
          onPress={openCreate}
          style={[styles.primaryBtn, { backgroundColor: tokens.colorPrimary }]}
        >
          <Text style={styles.primaryBtnLabel}>{t('clinical.allergies.add')}</Text>
        </Pressable>

        <Pressable
          onPress={openWeb}
          style={[styles.webHint, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
        >
          <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>{t('clinical.allergies.webHint')}</Text>
          <Text style={{ color: tokens.colorPrimary, fontWeight: '600', fontSize: 14 }}>{t('clinical.allergies.openWeb')}</Text>
        </Pressable>

        {sorted.length === 0 ? (
          <SectionCard title={t('clinical.listTitle')}>
            <Text style={{ color: tokens.colorTextSecondary }}>{t('clinical.allergies.empty')}</Text>
          </SectionCard>
        ) : (
          <SectionCard title={t('clinical.allergies.listCount', { count: sorted.length })}>
            <View style={styles.list}>
              {sorted.map((row) => {
                const severityKey = allergySeverityKey(row.severity)
                const severityLabel = severityKey ? t(`clinical.allergies.severity_${severityKey}`) : row.severity
                const severityColor =
                  severityKey === 'severe'
                    ? tokens.colorError
                    : severityKey === 'moderate'
                      ? tokens.colorWarning
                      : tokens.colorSuccess
                return (
                  <Pressable
                    key={row.id}
                    onPress={() => openEdit(row)}
                    style={[styles.row, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
                  >
                    <View style={styles.rowHeader}>
                      <Text style={[styles.itemName, { color: tokens.colorTextBase }]} numberOfLines={2}>
                        {row.allergen}
                      </Text>
                      {severityLabel ? (
                        <Text style={[styles.severityBadge, { color: severityColor, borderColor: severityColor }]}>
                          {severityLabel}
                        </Text>
                      ) : null}
                    </View>
                    {row.reaction ? (
                      <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }} numberOfLines={3}>
                        {t('clinical.allergies.reaction', { text: row.reaction })}
                      </Text>
                    ) : null}
                    {row.diagnosedDate ? (
                      <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>
                        {t('clinical.allergies.diagnosed', { date: formatClinicalDate(row.diagnosedDate, locale) })}
                      </Text>
                    ) : null}
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>{t('clinical.allergies.tapToEdit')}</Text>
                  </Pressable>
                )
              })}
            </View>
          </SectionCard>
        )}
      </ScrollView>

      <FormSheet
        visible={sheetOpen}
        title={editing ? t('clinical.allergies.editTitle') : t('clinical.allergies.addTitle')}
        onClose={closeSheet}
        onSave={() => void save()}
        saving={saving}
      >
        <FormField
          tokens={tokens}
          label={t('clinical.allergies.fieldAllergen')}
          value={allergen}
          onChangeText={setAllergen}
          autoCapitalize="sentences"
        />
        <FormField
          tokens={tokens}
          label={t('clinical.allergies.fieldReaction')}
          value={reaction}
          onChangeText={setReaction}
          multiline
        />
        <Text style={{ color: tokens.colorTextBase, fontWeight: '600', fontSize: 14 }}>
          {t('clinical.allergies.fieldSeverity')}
        </Text>
        <View style={styles.severityRow}>
          {severityOptions.map((opt) => {
            const active = severity === opt
            return (
              <Pressable
                key={opt}
                onPress={() => setSeverity(active ? null : opt)}
                style={[
                  styles.severityChip,
                  {
                    borderColor: active ? tokens.colorPrimary : tokens.colorBorder,
                    backgroundColor: active ? tokens.colorBgLayout : tokens.colorBgContainer,
                  },
                ]}
              >
                <Text style={{ color: active ? tokens.colorPrimary : tokens.colorTextSecondary, fontSize: 13 }}>
                  {t(`clinical.allergies.severity_${opt}`)}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <View>
          <Text style={{ color: tokens.colorTextBase, fontWeight: '600', fontSize: 14, marginBottom: 6 }}>
            {t('clinical.allergies.fieldDiagnosed')}
          </Text>
          <MaskedField
            tokens={tokens}
            value={diagnosedBr}
            onChangeText={setDiagnosedBr}
            format={formatDateBrInput}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
          />
        </View>
        <FormField tokens={tokens} label={t('clinical.allergies.fieldNotes')} value={notes} onChangeText={setNotes} multiline />
        {editing ? (
          <Pressable onPress={confirmDelete} style={[styles.deleteBtn, { borderColor: tokens.colorError }]}>
            <Text style={{ color: tokens.colorError, fontWeight: '600', textAlign: 'center' }}>
              {t('clinical.allergies.deleteConfirm')}
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
  severityBadge: {
    fontSize: 11,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  severityRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  severityChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  deleteBtn: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 8 },
})
