import { useCallback, useEffect, useMemo, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SectionCard } from '@/components/family/SectionCard'
import { StatePanel } from '@/components/StatePanel'
import { api } from '@/lib/api'
import type { ScheduledEvent, ScheduledEventKind } from '@/lib/api.types'
import { webPatientSectionTabUrl } from '@/lib/web-app-url'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = { patientId: string }

const KIND_META: Record<
  ScheduledEventKind,
  { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  appointment: { label: 'Consulta', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.12)', icon: 'calendar-outline' },
  reminder: { label: 'Lembrete', color: '#d97706', bg: 'rgba(217, 119, 6, 0.12)', icon: 'notifications-outline' },
  task: { label: 'Tarefa', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)', icon: 'checkbox-outline' },
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function sortUpcoming(events: ScheduledEvent[]): ScheduledEvent[] {
  const now = Date.now()
  return [...events]
    .filter((e) => e.status === 'planned' && new Date(e.scheduledAt).getTime() >= now - 86_400_000)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
}

export function PatientAgendaTab({ patientId }: Props) {
  const { tokens } = useAiyraTheme()
  const [events, setEvents] = useState<ScheduledEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const rows = await api.scheduledEvents.list(patientId)
      setEvents(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar agenda')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [patientId])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const upcoming = useMemo(() => sortUpcoming(events), [events])

  const openWebAgenda = () =>
    void Linking.openURL(webPatientSectionTabUrl(patientId, 'overview', 'agenda'))

  if (loading && events.length === 0 && !error) {
    return <StatePanel tokens={tokens} loading />
  }

  if (error && events.length === 0) {
    return <StatePanel tokens={tokens} error={error} onRetry={() => void load()} />
  }

  return (
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
        <Text style={[styles.title, { color: tokens.colorTextBase }]}>Agenda</Text>
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 14 }}>
          Próximos compromissos — calendário completo e edição no app web.
        </Text>
      </View>

      {upcoming.length === 0 ? (
        <SectionCard title="Próximos">
          <Text style={{ color: tokens.colorTextSecondary }}>Nenhum lembrete ou consulta próxima.</Text>
        </SectionCard>
      ) : (
        <SectionCard title={`${upcoming.length} próximo${upcoming.length === 1 ? '' : 's'}`}>
          <View style={styles.list}>
            {upcoming.map((event) => {
              const meta = KIND_META[event.kind] ?? KIND_META.reminder
              return (
                <View
                  key={event.id}
                  style={[styles.row, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon} size={20} color={meta.color} />
                  </View>
                  <View style={styles.body}>
                    <Text style={[styles.eventTitle, { color: tokens.colorTextBase }]}>{event.title}</Text>
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>{formatWhen(event.scheduledAt)}</Text>
                    <Text style={{ color: meta.color, fontSize: 11, fontWeight: '600', marginTop: 4 }}>{meta.label}</Text>
                    {event.description ? (
                      <Text style={{ color: tokens.colorTextSecondary, fontSize: 13, marginTop: 6 }} numberOfLines={3}>
                        {event.description}
                      </Text>
                    ) : null}
                  </View>
                </View>
              )
            })}
          </View>
        </SectionCard>
      )}

      <Pressable
        onPress={openWebAgenda}
        style={[styles.webLink, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
      >
        <Text style={{ color: tokens.colorPrimary, fontWeight: '600', textAlign: 'center' }}>
          Abrir agenda no navegador
        </Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
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
  webLink: { borderWidth: 1, borderRadius: 12, paddingVertical: 14, marginTop: 8 },
})
