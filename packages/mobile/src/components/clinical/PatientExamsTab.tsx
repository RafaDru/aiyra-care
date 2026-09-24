import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AvaAcceleratorButton } from '@/components/ava/AvaAcceleratorButton'
import { PatientExamMarkersPanel } from '@/components/charts/PatientExamMarkersPanel'
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
import type { Exam } from '@/lib/api.types'
import { formatClinicalDate } from '@/lib/clinical-format'
import { formatExamSource } from '@/lib/exam-format'
import { formatDateBrInput, isoDateToBrInput, parseDateBrToIso } from '@/lib/input-masks'
import { webPatientSectionTabUrl } from '@/lib/web-app-url'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = { patientId: string }

type ExamsSubview = 'list' | 'markers'

function SubviewToggle({
  value,
  onChange,
  tokens,
  labels,
}: {
  value: ExamsSubview
  onChange: (v: ExamsSubview) => void
  tokens: import('@/theme/useAiyraTheme').AiyraThemeTokens
  labels: { list: string; markers: string }
}) {
  const item = (key: ExamsSubview, label: string): ReactNode => {
    const on = value === key
    return (
      <Pressable
        key={key}
        onPress={() => onChange(key)}
        style={[
          styles.toggleBtn,
          {
            backgroundColor: on ? tokens.colorPrimary : tokens.colorBgContainer,
            borderColor: tokens.colorBorder,
          },
        ]}
      >
        <Text style={{ color: on ? '#fff' : tokens.colorTextBase, fontWeight: '600', fontSize: 14 }}>
          {label}
        </Text>
      </Pressable>
    )
  }
  return (
    <View style={styles.toggleRow}>
      {item('list', labels.list)}
      {item('markers', labels.markers)}
    </View>
  )
}

function sortExamsNewestFirst(rows: Exam[]): Exam[] {
  return [...rows].sort((a, b) => {
    const ta = new Date(a.examDate).getTime()
    const tb = new Date(b.examDate).getTime()
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta)
  })
}

export function PatientExamsTab({ patientId }: Props) {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const { tokens } = useAiyraTheme()
  const [subview, setSubview] = useState<ExamsSubview>('list')
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Exam | null>(null)
  const [examType, setExamType] = useState('')
  const [examDateBr, setExamDateBr] = useState('')
  const [laboratory, setLaboratory] = useState('')
  const [resultSummary, setResultSummary] = useState('')
  const [notes, setNotes] = useState('')

  const load = useCallback(async () => {
    setError(null)
    try {
      setExams(await api.exams.list(patientId))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('clinical.exams.loadError'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [patientId, t])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const sorted = useMemo(() => sortExamsNewestFirst(exams), [exams])
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR'
  const openWeb = () => void Linking.openURL(webPatientSectionTabUrl(patientId, 'clinical', 'exams'))

  const resetForm = () => {
    setEditing(null)
    setExamType('')
    setExamDateBr('')
    setLaboratory('')
    setResultSummary('')
    setNotes('')
  }

  const openCreate = () => {
    resetForm()
    setSheetOpen(true)
  }

  const openEdit = (exam: Exam) => {
    setEditing(exam)
    setExamType(exam.examType)
    setExamDateBr(isoDateToBrInput(exam.examDate))
    setLaboratory(exam.laboratory ?? '')
    setResultSummary(exam.resultSummary ?? '')
    setNotes(exam.notes ?? '')
    setSheetOpen(true)
  }

  const closeSheet = () => {
    setSheetOpen(false)
    resetForm()
  }

  const save = async () => {
    const type = examType.trim()
    if (!type) {
      toast.info(t('clinical.exams.typeRequired'))
      return
    }
    if (type.length > 100) {
      toast.info(t('clinical.exams.typeTooLong'))
      return
    }
    const examIso = parseDateBrToIso(examDateBr)
    if (!examIso) {
      toast.info(t('clinical.exams.invalidExamDate'))
      return
    }
    const payload = {
      examType: type,
      examDate: examIso,
      laboratory: laboratory.trim() || undefined,
      resultSummary: resultSummary.trim() || undefined,
      notes: notes.trim() || undefined,
    }
    setSaving(true)
    try {
      if (editing) {
        await api.exams.update(editing.id, payload)
        toast.success(t('clinical.exams.updated'))
      } else {
        await api.exams.create({ patientId, ...payload, source: 'manual' })
        toast.success(t('clinical.exams.created'))
      }
      closeSheet()
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('clinical.exams.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = () => {
    if (!editing) return
    Alert.alert(t('clinical.exams.deleteTitle'), t('clinical.exams.deleteMessage'), [
      { text: t('clinical.exams.cancel'), style: 'cancel' },
      {
        text: t('clinical.exams.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setSaving(true)
            try {
              await api.exams.delete(editing.id)
              toast.success(t('clinical.exams.deleted'))
              closeSheet()
              await load()
            } catch (err) {
              toast.error(err instanceof Error ? err.message : t('clinical.exams.saveError'))
            } finally {
              setSaving(false)
            }
          })()
        },
      },
    ])
  }

  if (subview === 'markers') {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.subviewHeader}>
          <Text style={[styles.title, { color: tokens.colorTextBase }]}>{t('clinical.exams.title')}</Text>
          <SubviewToggle
            value={subview}
            onChange={setSubview}
            tokens={tokens}
            labels={{
              list: t('clinical.exams.subviewList'),
              markers: t('clinical.exams.subviewMarkers'),
            }}
          />
        </View>
        <PatientExamMarkersPanel patientId={patientId} />
      </View>
    )
  }

  if (loading && exams.length === 0 && !error) return <StatePanel tokens={tokens} loading />
  if (error && exams.length === 0) return <StatePanel tokens={tokens} error={error} onRetry={() => void load()} />

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
          <Text style={[styles.title, { color: tokens.colorTextBase }]}>{t('clinical.exams.title')}</Text>
          <Text style={{ color: tokens.colorTextSecondary, fontSize: 14 }}>{t('clinical.exams.subtitleTx')}</Text>
          <SubviewToggle
            value={subview}
            onChange={setSubview}
            tokens={tokens}
            labels={{
              list: t('clinical.exams.subviewList'),
              markers: t('clinical.exams.subviewMarkers'),
            }}
          />
        </View>

        <Pressable onPress={openCreate} style={[styles.primaryBtn, { backgroundColor: tokens.colorPrimary }]}>
          <Text style={styles.primaryBtnLabel}>{t('clinical.exams.add')}</Text>
        </Pressable>

        <Pressable
          onPress={openWeb}
          style={[styles.webHint, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
        >
          <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>{t('clinical.exams.webHintTx')}</Text>
          <Text style={{ color: tokens.colorPrimary, fontWeight: '600', fontSize: 14 }}>
            {t('clinical.exams.openWeb')}
          </Text>
        </Pressable>

        {sorted.length === 0 ? (
          <SectionCard title={t('clinical.listTitle')}>
            <Text style={{ color: tokens.colorTextSecondary }}>{t('clinical.exams.empty')}</Text>
          </SectionCard>
        ) : (
          <SectionCard title={t('clinical.exams.listCount', { count: sorted.length })}>
            <View style={styles.list}>
              {sorted.map((exam) => (
                <Pressable
                  key={exam.id}
                  onPress={() => openEdit(exam)}
                  style={[styles.row, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
                >
                  <Text style={[styles.itemName, { color: tokens.colorTextBase }]} numberOfLines={2}>
                    {exam.examType}
                  </Text>
                  <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>
                    {formatClinicalDate(exam.examDate, locale)}
                    {exam.laboratory ? ` · ${exam.laboratory}` : ''}
                  </Text>
                  {exam.resultSummary ? (
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }} numberOfLines={3}>
                      {exam.resultSummary}
                    </Text>
                  ) : null}
                  {exam.resultFileUrl ? (
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>
                      {t('clinical.exams.hasResultFile')}
                    </Text>
                  ) : null}
                  <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>
                    {t('clinical.source', { source: formatExamSource(exam.source) })}
                  </Text>
                  <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>{t('clinical.exams.tapToEdit')}</Text>
                  <AvaAcceleratorButton
                    patientId={patientId}
                    initialMessage={t('ava.acceleratorExam')}
                    entityPin={{ entityType: 'exam', entityId: exam.id }}
                    compact
                  />
                </Pressable>
              ))}
            </View>
          </SectionCard>
        )}
      </ScrollView>

      <FormSheet
        visible={sheetOpen}
        title={editing ? t('clinical.exams.editTitle') : t('clinical.exams.addTitle')}
        onClose={closeSheet}
        onSave={() => void save()}
        saving={saving}
      >
        <FormField
          tokens={tokens}
          label={`${t('clinical.exams.fieldType')} *`}
          value={examType}
          onChangeText={setExamType}
        />
        <View>
          <Text style={{ color: tokens.colorTextBase, fontWeight: '600', fontSize: 14, marginBottom: 6 }}>
            {t('clinical.exams.fieldDate')} *
          </Text>
          <MaskedField
            tokens={tokens}
            value={examDateBr}
            onChangeText={setExamDateBr}
            format={formatDateBrInput}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
          />
        </View>
        <FormField
          tokens={tokens}
          label={t('clinical.exams.fieldLaboratory')}
          value={laboratory}
          onChangeText={setLaboratory}
        />
        <FormField
          tokens={tokens}
          label={t('clinical.exams.fieldResult')}
          value={resultSummary}
          onChangeText={setResultSummary}
          multiline
        />
        <FormField tokens={tokens} label={t('clinical.exams.fieldNotes')} value={notes} onChangeText={setNotes} multiline />

        {editing ? (
          <Pressable onPress={confirmDelete} style={[styles.deleteBtn, { borderColor: tokens.colorError }]}>
            <Text style={{ color: tokens.colorError, fontWeight: '600', textAlign: 'center' }}>
              {t('clinical.exams.deleteConfirm')}
            </Text>
          </Pressable>
        ) : null}
      </FormSheet>
    </>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  subviewHeader: { padding: 16, paddingBottom: 0, gap: 8 },
  toggleRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  toggleBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  primaryBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryBtnLabel: { color: '#fff', fontWeight: '700', fontSize: 16 },
  webHint: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  list: { gap: 10 },
  row: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  itemName: { fontSize: 16, fontWeight: '600' },
  deleteBtn: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 8 },
})
