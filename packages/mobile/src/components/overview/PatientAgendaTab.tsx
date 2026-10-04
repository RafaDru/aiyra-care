import { useCallback, useEffect, useMemo, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
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
import type { ScheduledEvent, ScheduledEventKind, ScheduledEventStatus } from '@/lib/api.types'
import {
  formatDateBrInput,
  formatTimeBrInput,
  isoToDateTimeBrParts,
  parseDateTimeBrToIso,
} from '@/lib/input-masks'
import { webPatientSectionTabUrl } from '@/lib/web-app-url'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = { patientId: string }

const KINDS: ScheduledEventKind[] = ['appointment', 'reminder', 'task']
const STATUSES: ScheduledEventStatus[] = ['planned', 'done', 'cancelled']

const KIND_ICON: Record<ScheduledEventKind, keyof typeof Ionicons.glyphMap> = {
  appointment: 'calendar-outline',
  reminder: 'notifications-outline',
  task: 'checkbox-outline',
}

const KIND_COLOR: Record<ScheduledEventKind, string> = {
  appointment: '#2563eb',
  reminder: '#d97706',
  task: '#7c3aed',
}

function defaultDateTimeForCreate(): { date: string; time: string } {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  const parts = isoToDateTimeBrParts(d.toISOString())
  return { date: parts.date, time: parts.time }
}

function sortForDisplay(events: ScheduledEvent[]): ScheduledEvent[] {
  const cutoff = Date.now() - 86_400_000
  return [...events].sort((a, b) => {
    const aUp = a.status === 'planned' && new Date(a.scheduledAt).getTime() >= cutoff
    const bUp = b.status === 'planned' && new Date(b.scheduledAt).getTime() >= cutoff
    if (aUp && !bUp) return -1
    if (!aUp && bUp) return 1
    const ta = new Date(a.scheduledAt).getTime()
    const tb = new Date(b.scheduledAt).getTime()
    if (aUp && bUp) return ta - tb
    return tb - ta
  })
}

export function PatientAgendaTab({ patientId }: Props) {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const { tokens } = useAiyraTheme()
  const [events, setEvents] = useState<ScheduledEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<ScheduledEvent | null>(null)
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<ScheduledEventKind>('reminder')
  const [status, setStatus] = useState<ScheduledEventStatus>('planned')
  const [dateBr, setDateBr] = useState('')
  const [timeBr, setTimeBr] = useState('')
  const [description, setDescription] = useState('')

  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR'

  const load = useCallback(async () => {
    setError(null)
    try {
      setEvents(await api.scheduledEvents.list(patientId))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('overview.agenda.loadError'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [patientId, t])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const sorted = useMemo(() => sortForDisplay(events), [events])

  const formatWhen = (iso: string) =>
    new Date(iso).toLocaleString(locale, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })

  const openWebAgenda = () =>
    void Linking.openURL(webPatientSectionTabUrl(patientId, 'overview', 'agenda'))

  const resetForm = () => {
    setEditing(null)
    setTitle('')
    setKind('reminder')
    setStatus('planned')
    setDateBr('')
    setTimeBr('')
    setDescription('')
  }

  const openCreate = () => {
    resetForm()
    const { date, time } = defaultDateTimeForCreate()
    setDateBr(date)
    setTimeBr(time)
    setSheetOpen(true)
  }

  const openEdit = (event: ScheduledEvent) => {
    setEditing(event)
    setTitle(event.title)
    setKind(event.kind)
    setStatus(event.status)
    const parts = isoToDateTimeBrParts(event.scheduledAt)
    setDateBr(parts.date)
    setTimeBr(parts.time)
    setDescription(event.description ?? '')
    setSheetOpen(true)
  }

  const closeSheet = () => {
    setSheetOpen(false)
    resetForm()
  }

  const save = async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      toast.info(t('overview.agenda.titleRequired'))
      return
    }
    if (trimmedTitle.length > 500) {
      toast.info(t('overview.agenda.titleTooLong'))
      return
    }
    const scheduledIso = parseDateTimeBrToIso(dateBr, timeBr)
    if (!scheduledIso) {
      toast.info(t('overview.agenda.invalidWhen'))
      return
    }
    const payload = {
      title: trimmedTitle,
      scheduledAt: scheduledIso,
      kind,
      description: description.trim() || undefined,
      status: editing ? status : undefined,
    }
    setSaving(true)
    try {
      if (editing) {
        await api.scheduledEvents.update(editing.id, payload)
        toast.success(t('overview.agenda.updated'))
      } else {
        await api.scheduledEvents.create({ patientId, ...payload, status: 'planned' })
        toast.success(t('overview.agenda.created'))
      }
      closeSheet()
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('overview.agenda.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const markDone = async (event: ScheduledEvent) => {
    setSaving(true)
    try {
      await api.scheduledEvents.update(event.id, { status: 'done' })
      toast.success(t('overview.agenda.markedDone'))
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('overview.agenda.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = () => {
    if (!editing) return
    Alert.alert(t('overview.agenda.deleteTitle'), t('overview.agenda.deleteMessage'), [
      { text: t('overview.agenda.cancel'), style: 'cancel' },
      {
        text: t('overview.agenda.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setSaving(true)
            try {
              await api.scheduledEvents.delete(editing.id)
              toast.success(t('overview.agenda.deleted'))
              closeSheet()
              await load()
            } catch (err) {
              toast.error(err instanceof Error ? err.message : t('overview.agenda.saveError'))
            } finally {
              setSaving(false)
            }
          })()
        },
      },
    ])
  }

  if (loading && events.length === 0 && !error) return <StatePanel tokens={tokens} loading />
  if (error && events.length === 0) return <StatePanel tokens={tokens} error={error} onRetry={() => void load()} />

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
          <Text style={[styles.title, { color: tokens.colorTextBase }]}>{t('overview.agenda.title')}</Text>
          <Text style={{ color: tokens.colorTextSecondary, fontSize: 14 }}>{t('overview.agenda.subtitleTx')}</Text>
        </View>

        <Pressable onPress={openCreate} style={[styles.primaryBtn, { backgroundColor: tokens.colorPrimary }]}>
          <Text style={styles.primaryBtnLabel}>{t('overview.agenda.add')}</Text>
        </Pressable>

        <Pressable
          onPress={openWebAgenda}
          style={[styles.webHint, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
        >
          <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>{t('overview.agenda.webHintTx')}</Text>
          <Text style={{ color: tokens.colorPrimary, fontWeight: '600', fontSize: 14 }}>
            {t('overview.agenda.openWeb')}
          </Text>
        </Pressable>

        {sorted.length === 0 ? (
          <SectionCard title={t('overview.agenda.listTitle')}>
            <Text style={{ color: tokens.colorTextSecondary }}>{t('overview.agenda.empty')}</Text>
          </SectionCard>
        ) : (
          <SectionCard title={t('overview.agenda.listCount', { count: sorted.length })}>
            <View style={styles.list}>
              {sorted.map((event) => {
                const color = KIND_COLOR[event.kind] ?? KIND_COLOR.reminder
                const bg = `${color}1f`
                const icon = KIND_ICON[event.kind] ?? KIND_ICON.reminder
                return (
                  <Pressable
                    key={event.id}
                    onPress={() => openEdit(event)}
                    style={[styles.row, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: bg }]}>
                      <Ionicons name={icon} size={20} color={color} />
                    </View>
                    <View style={styles.body}>
                      <Text style={[styles.eventTitle, { color: tokens.colorTextBase }]} numberOfLines={2}>
                        {event.title}
                      </Text>
                      <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>{formatWhen(event.scheduledAt)}</Text>
                      <View style={styles.badges}>
                        <Text style={{ color, fontSize: 11, fontWeight: '600' }}>
                          {t(`overview.agenda.kind.${event.kind}`)}
                        </Text>
                        {event.status !== 'planned' ? (
                          <Text style={{ color: tokens.colorTextSecondary, fontSize: 11 }}>
                            · {t(`overview.agenda.status.${event.status}`)}
                          </Text>
                        ) : null}
                      </View>
                      {event.description ? (
                        <Text style={{ color: tokens.colorTextSecondary, fontSize: 13, marginTop: 4 }} numberOfLines={2}>
                          {event.description}
                        </Text>
                      ) : null}
                      {event.status === 'planned' ? (
                        <Pressable
                          onPress={() => void markDone(event)}
                          style={[styles.doneBtn, { borderColor: tokens.colorPrimary }]}
                        >
                          <Text style={{ color: tokens.colorPrimary, fontSize: 12, fontWeight: '600' }}>
                            {t('overview.agenda.markDone')}
                          </Text>
                        </Pressable>
                      ) : null}
                      <Text style={{ color: tokens.colorTextSecondary, fontSize: 12, marginTop: 4 }}>
                        {t('overview.agenda.tapToEdit')}
                      </Text>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </SectionCard>
        )}
      </ScrollView>

      <FormSheet
        visible={sheetOpen}
        title={editing ? t('overview.agenda.editTitle') : t('overview.agenda.addTitle')}
        onClose={closeSheet}
        onSave={() => void save()}
        saving={saving}
      >
        <FormField
          tokens={tokens}
          label={`${t('overview.agenda.fieldTitle')} *`}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={{ color: tokens.colorTextBase, fontWeight: '600', fontSize: 14, marginBottom: 6 }}>
          {t('overview.agenda.fieldKind')}
        </Text>
        <View style={styles.chipRow}>
          {KINDS.map((k) => {
            const active = kind === k
            const color = KIND_COLOR[k]
            return (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                style={[
                  styles.chip,
                  {
                    borderColor: active ? color : tokens.colorBorder,
                    backgroundColor: active ? `${color}18` : tokens.colorBgContainer,
                  },
                ]}
              >
                <Text style={{ color: active ? color : tokens.colorTextBase, fontWeight: '600', fontSize: 13 }}>
                  {t(`overview.agenda.kind.${k}`)}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <View>
          <Text style={{ color: tokens.colorTextBase, fontWeight: '600', fontSize: 14, marginBottom: 6 }}>
            {t('overview.agenda.fieldWhen')} *
          </Text>
          <MaskedField
            tokens={tokens}
            value={dateBr}
            onChangeText={setDateBr}
            format={formatDateBrInput}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
          />
          <View style={{ height: 8 }} />
          <MaskedField
            tokens={tokens}
            value={timeBr}
            onChangeText={setTimeBr}
            format={formatTimeBrInput}
            placeholder="HH:MM"
            keyboardType="number-pad"
          />
        </View>

        <FormField
          tokens={tokens}
          label={t('overview.agenda.fieldDescription')}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        {editing ? (
          <>
            <Text style={{ color: tokens.colorTextBase, fontWeight: '600', fontSize: 14, marginBottom: 6 }}>
              {t('overview.agenda.fieldStatus')}
            </Text>
            <View style={styles.chipRow}>
              {STATUSES.map((s) => {
                const active = status === s
                return (
                  <Pressable
                    key={s}
                    onPress={() => setStatus(s)}
                    style={[
                      styles.chip,
                      {
                        borderColor: active ? tokens.colorPrimary : tokens.colorBorder,
                        backgroundColor: active ? tokens.colorBgLayout : tokens.colorBgContainer,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? tokens.colorPrimary : tokens.colorTextBase,
                        fontWeight: '600',
                        fontSize: 13,
                      }}
                    >
                      {t(`overview.agenda.status.${s}`)}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
            <Pressable onPress={confirmDelete} style={[styles.deleteBtn, { borderColor: tokens.colorError }]}>
              <Text style={{ color: tokens.colorError, fontWeight: '600', textAlign: 'center' }}>
                {t('overview.agenda.deleteConfirm')}
              </Text>
            </Pressable>
          </>
        ) : null}
      </FormSheet>
    </>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 48 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  primaryBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryBtnLabel: { color: '#fff', fontWeight: '700', fontSize: 16 },
  webHint: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  list: { gap: 10 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderWidth: 1, borderRadius: 12, padding: 12 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  eventTitle: { fontSize: 16, fontWeight: '600' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  doneBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  deleteBtn: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 8 },
})
