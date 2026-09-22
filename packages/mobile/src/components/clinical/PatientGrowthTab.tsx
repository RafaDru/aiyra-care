import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { MeasurementSeriesLineChart } from '@/components/charts/MeasurementSeriesLineChart'
import { WhoGrowthLineChart } from '@/components/charts/WhoGrowthLineChart'
import { SectionCard } from '@/components/family/SectionCard'
import { StatePanel } from '@/components/StatePanel'
import { api } from '@/lib/api'
import type { MeasurementChartSeries, Patient, WhoGrowthPayload } from '@/lib/api.types'
import { webPatientSectionTabUrl } from '@/lib/web-app-url'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = { patientId: string }

const WHO_METRICS: Array<'weight' | 'height' | 'head_circumference'> = [
  'weight',
  'height',
  'head_circumference',
]

function seriesHasPoints(s: MeasurementChartSeries): boolean {
  return s.points.some((p) => p.value != null || p.valueSecondary != null)
}

function measurementTitle(t: (key: string) => string, series: MeasurementChartSeries): string {
  const key = series.labelKey
  if (key && t(key) !== key) return t(key)
  const fallback = `measurement.type.${series.typeCode}`
  const label = t(fallback)
  return label !== fallback ? label : series.typeCode
}

export function PatientGrowthTab({ patientId }: Props) {
  const { t, i18n } = useTranslation()
  const { tokens } = useAiyraTheme()
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR'
  const [patient, setPatient] = useState<Patient | null>(null)
  const [who, setWho] = useState<Partial<Record<string, WhoGrowthPayload>>>({})
  const [vitalsSeries, setVitalsSeries] = useState<MeasurementChartSeries[]>([])
  const [anthroSeries, setAnthroSeries] = useState<MeasurementChartSeries[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const canWho =
    patient?.birthDate &&
    patient.gender &&
    (patient.gender === 'male' || patient.gender === 'female')

  const load = useCallback(async () => {
    setError(null)
    try {
      const p = await api.patients.get(patientId)
      setPatient(p)
      const whoEligible =
        p.birthDate && p.gender && (p.gender === 'male' || p.gender === 'female')
      const [vitalsRes, anthroRes, ...whoResults] = await Promise.all([
        api.measurements.chartSeries({ patientId, categories: 'vital_sign,lab_point' }),
        api.measurements.chartSeries({ patientId, categories: 'anthropometry' }),
        ...(whoEligible
          ? WHO_METRICS.map((typeCode) =>
              api.measurements.whoGrowth({ patientId, typeCode }).catch(() => null),
            )
          : []),
      ])
      setVitalsSeries(vitalsRes.series.filter(seriesHasPoints))
      setAnthroSeries(anthroRes.series.filter(seriesHasPoints))
      if (whoEligible) {
        const next: Partial<Record<string, WhoGrowthPayload>> = {}
        WHO_METRICS.forEach((code, i) => {
          const payload = whoResults[i] as WhoGrowthPayload | null
          if (payload?.referenceCurve?.length) next[code] = payload
        })
        setWho(next)
      } else {
        setWho({})
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('clinical.growth.loadError'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [patientId, t])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const whoCharts = useMemo(
    () => WHO_METRICS.map((code) => who[code]).filter(Boolean) as WhoGrowthPayload[],
    [who],
  )

  const openWeb = () => void Linking.openURL(webPatientSectionTabUrl(patientId, 'clinical', 'growth'))

  if (loading && !patient && !error) return <StatePanel tokens={tokens} loading />
  if (error && !patient) return <StatePanel tokens={tokens} error={error} onRetry={() => void load()} />

  const whoLabels = {
    p3: t('measurement.whoP3'),
    p50: t('measurement.whoP50'),
    p97: t('measurement.whoP97'),
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
        <Text style={[styles.title, { color: tokens.colorTextBase }]}>{t('clinical.growth.title')}</Text>
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 14 }}>{t('clinical.growth.subtitle')}</Text>
      </View>

      <Pressable
        onPress={openWeb}
        style={[styles.webHint, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
      >
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>{t('clinical.growth.webHint')}</Text>
        <Text style={{ color: tokens.colorPrimary, fontWeight: '600', fontSize: 14 }}>
          {t('clinical.growth.openWeb')}
        </Text>
      </Pressable>

      {!canWho ? (
        <SectionCard title={t('measurement.whoTitle')}>
          <Text style={{ color: tokens.colorTextSecondary }}>{t('clinical.growth.whoProfileHint')}</Text>
        </SectionCard>
      ) : whoCharts.length === 0 ? (
        <SectionCard title={t('measurement.whoTitle')}>
          <Text style={{ color: tokens.colorTextSecondary }}>{t('measurement.noChartData')}</Text>
        </SectionCard>
      ) : (
        <SectionCard title={t('measurement.whoTitle')}>
          {whoCharts.map((payload) => (
            <WhoGrowthLineChart
              key={payload.typeCode}
              payload={payload}
              title={t(`measurement.type.${payload.typeCode}`)}
              tokens={tokens}
              whoLabels={whoLabels}
              lastPercentileText={
                payload.patientPoints.length > 0
                  ? t('measurement.whoLastPercentile', {
                      value: payload.patientPoints[payload.patientPoints.length - 1].percentile ?? '—',
                    })
                  : undefined
              }
              locale={locale}
            />
          ))}
        </SectionCard>
      )}

      <SectionCard title={t('measurement.vitalsSection')}>
        {vitalsSeries.length === 0 ? (
          <Text style={{ color: tokens.colorTextSecondary }}>{t('measurement.noChartData')}</Text>
        ) : (
          vitalsSeries.map((s) => (
            <MeasurementSeriesLineChart
              key={s.typeCode}
              series={s}
              title={measurementTitle(t, s)}
              tokens={tokens}
              locale={locale}
              systolicLabel={t('measurement.component.systolic')}
              diastolicLabel={t('measurement.component.diastolic')}
            />
          ))
        )}
      </SectionCard>

      <SectionCard title={t('measurement.tabAnthropometry')}>
        {anthroSeries.length === 0 ? (
          <Text style={{ color: tokens.colorTextSecondary }}>{t('measurement.noChartData')}</Text>
        ) : (
          anthroSeries.map((s) => (
            <MeasurementSeriesLineChart
              key={s.typeCode}
              series={s}
              title={measurementTitle(t, s)}
              tokens={tokens}
              locale={locale}
            />
          ))
        )}
      </SectionCard>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  webHint: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
})
