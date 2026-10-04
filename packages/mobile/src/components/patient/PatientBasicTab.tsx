import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
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
import type { Patient } from '@/lib/api.types'
import { formatClinicalDate } from '@/lib/clinical-format'
import {
  digitsOnly,
  formatCpfInput,
  formatDateBrInput,
  isoDateToBrInput,
  parseDateBrToIso,
} from '@/lib/input-masks'
import { useAiyraTheme } from '@/theme/useAiyraTheme'
import { router } from 'expo-router'
type Props = { patientId: string; onPatientUpdated?: (name: string) => void }

export function PatientBasicTab({ patientId, onPatientUpdated }: Props) {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const { tokens } = useAiyraTheme()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [birthDateBr, setBirthDateBr] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | null>(null)
  const [cpf, setCpf] = useState('')
  const [cns, setCns] = useState('')
  const [exporting, setExporting] = useState(false)

  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR'

  const load = useCallback(async () => {
    setError(null)
    try {
      const p = await api.patients.get(patientId)
      setPatient(p)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('patient.basic.loadError'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [patientId, t])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const openEdit = () => {
    if (!patient) return
    setName(patient.name)
    setBirthDateBr(isoDateToBrInput(patient.birthDate))
    setGender(patient.gender)
    setCpf(patient.cpf ? formatCpfInput(patient.cpf) : '')
    setCns(patient.cns ?? '')
    setSheetOpen(true)
  }

  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.info(t('patient.basic.nameRequired'))
      return
    }
    const birthIso = parseDateBrToIso(birthDateBr)
    if (!birthIso) {
      toast.info(t('patient.basic.invalidBirthDate'))
      return
    }
    const cpfDigits = digitsOnly(cpf)
    if (cpf.trim() && cpfDigits.length !== 11) {
      toast.info(t('patient.basic.invalidCpf'))
      return
    }
    setSaving(true)
    try {
      const updated = await api.patients.update(patientId, {
        name: trimmed,
        birthDate: birthIso,
        gender: gender ?? undefined,
        cpf: cpfDigits.length === 11 ? cpfDigits : undefined,
        cns: cns.trim() || undefined,
      })
      setPatient(updated)
      onPatientUpdated?.(updated.name)
      setSheetOpen(false)
      toast.success(t('patient.basic.updated'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('patient.basic.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = () => {
    if (!patient || patient.isSelf || patient.membershipRole === 'self') {
      toast.info(t('patient.basic.cannotDeleteSelf'))
      return
    }
    Alert.alert(t('patient.basic.deleteTitle'), t('patient.basic.deleteMessage'), [
      { text: t('patient.basic.cancel'), style: 'cancel' },
      {
        text: t('patient.basic.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setSaving(true)
            try {
              await api.patients.delete(patientId)
              toast.success(t('patient.basic.deleted'))
              router.replace('/(app)/(tabs)')
            } catch (err) {
              toast.error(err instanceof Error ? err.message : t('patient.basic.saveError'))
            } finally {
              setSaving(false)
            }
          })()
        },
      },
    ])
  }

  const shareExport = async (mode: 'summary' | 'full') => {
    setExporting(true)
    try {
      const res = await api.patients.createClinicalExportShare(patientId, { mode, ttlHours: 72 })
      await Share.share({ message: res.shareUrl, title: t('patient.basic.exportTitle') })
      toast.success(t('patient.basic.exportCreated'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('patient.basic.exportError'))
    } finally {
      setExporting(false)
    }
  }

  if (loading && !patient && !error) return <StatePanel tokens={tokens} loading />
  if (error && !patient) return <StatePanel tokens={tokens} error={error} onRetry={() => void load()} />
  if (!patient) return null

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
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 14 }}>{t('patient.basic.subtitleTx')}</Text>

        <Pressable onPress={openEdit} style={[styles.primaryBtn, { backgroundColor: tokens.colorPrimary }]}>
          <Text style={styles.primaryBtnLabel}>{t('patient.basic.edit')}</Text>
        </Pressable>

        <SectionCard title={t('patient.basic.sectionIdentity')}>
          <Text style={[styles.name, { color: tokens.colorTextBase }]}>{patient.name}</Text>
          <Text style={{ color: tokens.colorTextSecondary }}>
            {formatClinicalDate(patient.birthDate, locale)}
            {patient.gender
              ? ` · ${patient.gender === 'female' ? t('onboarding.genderFemale') : t('onboarding.genderMale')}`
              : ''}
          </Text>
          {patient.cpf ? <Text style={{ color: tokens.colorTextSecondary }}>CPF: {formatCpfInput(patient.cpf)}</Text> : null}
          {patient.cns ? <Text style={{ color: tokens.colorTextSecondary }}>CNS: {patient.cns}</Text> : null}
          {patient.isSelf || patient.membershipRole === 'self' ? (
            <Text style={{ color: tokens.colorPrimary, fontSize: 12, marginTop: 6 }}>{t('patient.you')}</Text>
          ) : null}
        </SectionCard>

        <SectionCard title={t('patient.basic.sectionExport')}>
          <Text style={{ color: tokens.colorTextSecondary, fontSize: 13, marginBottom: 8 }}>
            {t('patient.basic.exportHint')}
          </Text>
          <View style={styles.exportRow}>
            <Pressable
              disabled={exporting}
              onPress={() => void shareExport('summary')}
              style={[styles.exportBtn, { borderColor: tokens.colorBorder }]}
            >
              <Text style={{ color: tokens.colorPrimary, fontWeight: '600' }}>{t('patient.basic.exportSummary')}</Text>
            </Pressable>
            <Pressable
              disabled={exporting}
              onPress={() => void shareExport('full')}
              style={[styles.exportBtn, { borderColor: tokens.colorBorder }]}
            >
              <Text style={{ color: tokens.colorPrimary, fontWeight: '600' }}>{t('patient.basic.exportFull')}</Text>
            </Pressable>
          </View>
        </SectionCard>

        {!patient.isSelf && patient.membershipRole !== 'self' ? (
          <Pressable onPress={confirmDelete} style={[styles.deleteBtn, { borderColor: tokens.colorError }]}>
            <Text style={{ color: tokens.colorError, fontWeight: '600', textAlign: 'center' }}>
              {t('patient.basic.deleteConfirm')}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <FormSheet
        visible={sheetOpen}
        title={t('patient.basic.editTitle')}
        onClose={() => setSheetOpen(false)}
        onSave={() => void save()}
        saving={saving}
      >
        <FormField tokens={tokens} label={`${t('patient.basic.fieldName')} *`} value={name} onChangeText={setName} />
        <View>
          <Text style={{ color: tokens.colorTextBase, fontWeight: '600', fontSize: 14, marginBottom: 6 }}>
            {t('patient.basic.fieldBirthDate')} *
          </Text>
          <MaskedField
            tokens={tokens}
            value={birthDateBr}
            onChangeText={setBirthDateBr}
            format={formatDateBrInput}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
          />
        </View>
        <Text style={{ color: tokens.colorTextBase, fontWeight: '600', fontSize: 14, marginBottom: 6 }}>
          {t('patient.basic.fieldGender')}
        </Text>
        <View style={styles.chipRow}>
          {(['female', 'male'] as const).map((g) => {
            const active = gender === g
            return (
              <Pressable
                key={g}
                onPress={() => setGender(g)}
                style={[
                  styles.chip,
                  {
                    borderColor: active ? tokens.colorPrimary : tokens.colorBorder,
                    backgroundColor: active ? tokens.colorBgLayout : tokens.colorBgContainer,
                  },
                ]}
              >
                <Text style={{ color: active ? tokens.colorPrimary : tokens.colorTextBase }}>
                  {g === 'female' ? t('onboarding.genderFemale') : t('onboarding.genderMale')}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <FormField
          tokens={tokens}
          label={t('patient.basic.fieldCpf')}
          value={cpf}
          onChangeText={(v) => setCpf(formatCpfInput(v))}
          keyboardType="number-pad"
        />
        <FormField tokens={tokens} label={t('patient.basic.fieldCns')} value={cns} onChangeText={setCns} />
      </FormSheet>
    </>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  primaryBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryBtnLabel: { color: '#fff', fontWeight: '700', fontSize: 16 },
  name: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  exportRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  exportBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  deleteBtn: { borderWidth: 1, borderRadius: 12, padding: 14 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
})
