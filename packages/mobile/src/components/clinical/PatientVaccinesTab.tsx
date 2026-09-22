import { useCallback, useEffect, useMemo, useState } from 'react'
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { SectionCard } from '@/components/family/SectionCard'
import { StatePanel } from '@/components/StatePanel'
import { api } from '@/lib/api'
import type { Vaccine } from '@/lib/api.types'
import { formatClinicalDate, formatVaccineSource } from '@/lib/clinical-format'
import { webPatientSectionTabUrl } from '@/lib/web-app-url'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = {
  patientId: string
}

function sortVaccinesNewestFirst(rows: Vaccine[]): Vaccine[] {
  return [...rows].sort((a, b) => {
    const ta = new Date(a.applicationDate).getTime()
    const tb = new Date(b.applicationDate).getTime()
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta)
  })
}

export function PatientVaccinesTab({ patientId }: Props) {
  const { t, i18n } = useTranslation()
  const { tokens } = useAiyraTheme()
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const rows = await api.vaccines.list(patientId)
      setVaccines(rows)
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

  if (loading && vaccines.length === 0 && !error) {
    return <StatePanel tokens={tokens} loading />
  }

  if (error && vaccines.length === 0) {
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
        <Text style={[styles.title, { color: tokens.colorTextBase }]}>{t('clinical.vaccines.title')}</Text>
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 14 }}>{t('clinical.vaccines.subtitle')}</Text>
      </View>

      <Pressable
        onPress={openWeb}
        style={[styles.webHint, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
      >
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>{t('clinical.vaccines.webHint')}</Text>
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
              <View
                key={vaccine.id}
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
                {vaccine.notes ? (
                  <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }} numberOfLines={3}>
                    {vaccine.notes}
                  </Text>
                ) : null}
                <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>
                  {t('clinical.source', { source: formatVaccineSource(vaccine.source) })}
                </Text>
              </View>
            ))}
          </View>
        </SectionCard>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  webHint: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  list: { gap: 10 },
  row: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  itemName: { fontSize: 16, fontWeight: '600' },
})
