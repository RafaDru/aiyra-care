import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { AvaAcceleratorButton } from '@/components/ava/AvaAcceleratorButton'
import { MarkerTrendLineChart } from '@/components/charts/MarkerTrendLineChart'
import { SectionCard } from '@/components/family/SectionCard'
import { StatePanel } from '@/components/StatePanel'
import { api } from '@/lib/api'
import type { MarkerTrendGroup } from '@/lib/api.types'
import { formatClinicalDate } from '@/lib/clinical-format'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = { patientId: string }

const STATUS_ORDER: Record<string, number> = { critical: 0, altered: 1, normal: 2 }

function sortGroups(data: MarkerTrendGroup[]): MarkerTrendGroup[] {
  return [...data].sort((a, b) => {
    const sa = STATUS_ORDER[a.latestStatus] ?? 3
    const sb = STATUS_ORDER[b.latestStatus] ?? 3
    if (sa !== sb) return sa - sb
    return a.markerName.localeCompare(b.markerName)
  })
}

function statusLabel(status: string, t: (k: string) => string): string {
  if (status === 'critical') return t('clinical.examMarkers.statusCritical')
  if (status === 'altered') return t('clinical.examMarkers.statusAltered')
  return t('clinical.examMarkers.statusNormal')
}

function statusColor(status: string): string {
  if (status === 'critical') return '#cf1322'
  if (status === 'altered') return '#d48806'
  return '#389e0d'
}

export function PatientExamMarkersPanel({ patientId }: Props) {
  const { t, i18n } = useTranslation()
  const { tokens } = useAiyraTheme()
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [groups, setGroups] = useState<MarkerTrendGroup[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = sortGroups(await api.examMarkers.getTrends(patientId))
      setGroups(data)
      setSelected((prev) => {
        if (prev && data.some((g) => g.markerName === prev)) return prev
        return data[0]?.markerName ?? null
      })
    } catch (err) {
      setGroups([])
      setError(err instanceof Error ? err.message : t('clinical.examMarkers.loadError'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [patientId, t])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return groups
    return groups.filter(
      (g) =>
        g.markerName.toLowerCase().includes(q) ||
        (g.technicalName?.toLowerCase().includes(q) ?? false),
    )
  }, [groups, search])

  const active =
    filtered.find((g) => g.markerName === selected) ?? filtered[0] ?? null

  if (loading && groups.length === 0 && !error) {
    return <StatePanel tokens={tokens} loading />
  }
  if (error && groups.length === 0) {
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
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ color: tokens.colorTextSecondary, fontSize: 14 }}>
        {t('clinical.examMarkers.subtitle')}
      </Text>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={t('clinical.examMarkers.searchPlaceholder')}
        placeholderTextColor={tokens.colorTextSecondary}
        style={[
          styles.search,
          {
            color: tokens.colorTextBase,
            borderColor: tokens.colorBorder,
            backgroundColor: tokens.colorBgContainer,
          },
        ]}
      />

      {filtered.length === 0 ? (
        <SectionCard title={t('clinical.examMarkers.emptyTitle')}>
          <Text style={{ color: tokens.colorTextSecondary }}>{t('clinical.examMarkers.empty')}</Text>
        </SectionCard>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {filtered.map((g) => {
              const on = g.markerName === active?.markerName
              return (
                <Pressable
                  key={g.markerName}
                  onPress={() => setSelected(g.markerName)}
                  style={[
                    styles.chip,
                    {
                      borderColor: on ? tokens.colorPrimary : tokens.colorBorder,
                      backgroundColor: on ? tokens.colorBgLayout : tokens.colorBgContainer,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: on ? tokens.colorPrimary : tokens.colorTextBase,
                      fontWeight: on ? '700' : '500',
                      fontSize: 13,
                    }}
                    numberOfLines={1}
                  >
                    {g.markerName}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>

          {active ? (
            <SectionCard title={active.markerName}>
              <View style={styles.meta}>
                <Text style={{ color: tokens.colorTextBase, fontSize: 16, fontWeight: '700' }}>
                  {active.latestValue}
                </Text>
                <Text style={{ color: statusColor(active.latestStatus), fontSize: 13, fontWeight: '600' }}>
                  {statusLabel(active.latestStatus, t)}
                </Text>
                <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>
                  {formatClinicalDate(active.latestCollectedAt, locale)}
                </Text>
              </View>
              <AvaAcceleratorButton
                patientId={patientId}
                initialMessage={t('ava.acceleratorMarker')}
                entityPin={{ entityType: 'exam_marker', markerName: active.markerName }}
              />
              <MarkerTrendLineChart group={active} tokens={tokens} locale={locale} />
              <View style={styles.history}>
                {active.points
                  .slice()
                  .reverse()
                  .map((p) => (
                    <View
                      key={`${p.examId}-${p.collectedAt}`}
                      style={[styles.historyRow, { borderColor: tokens.colorBorder }]}
                    >
                      <Text style={{ color: tokens.colorTextSecondary, fontSize: 12, flex: 1 }}>
                        {formatClinicalDate(p.collectedAt, locale)}
                      </Text>
                      <Text style={{ color: tokens.colorTextBase, fontWeight: '600', fontSize: 14 }}>
                        {p.displayValue}
                      </Text>
                    </View>
                  ))}
              </View>
            </SectionCard>
          ) : null}
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 48 },
  search: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  chips: { gap: 8, paddingVertical: 4 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, maxWidth: 200 },
  meta: { gap: 4, marginBottom: 8 },
  history: { marginTop: 16, gap: 8 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 6,
  },
})
