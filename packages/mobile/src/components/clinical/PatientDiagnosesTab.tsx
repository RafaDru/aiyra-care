import { useCallback, useEffect, useMemo, useState } from 'react'
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { SectionCard } from '@/components/family/SectionCard'
import { StatePanel } from '@/components/StatePanel'
import { api } from '@/lib/api'
import type { Diagnosis } from '@/lib/api.types'
import { formatClinicalDate } from '@/lib/clinical-format'
import { webPatientSectionTabUrl } from '@/lib/web-app-url'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = { patientId: string }

function sortDiagnoses(rows: Diagnosis[]): Diagnosis[] {
  return [...rows].sort((a, b) => a.diagnosisName.localeCompare(b.diagnosisName, 'pt-BR'))
}

export function PatientDiagnosesTab({ patientId }: Props) {
  const { t, i18n } = useTranslation()
  const { tokens } = useAiyraTheme()
  const [rows, setRows] = useState<Diagnosis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      setRows(await api.diagnoses.list(patientId))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('clinical.diagnoses.loadError'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [patientId, t])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const sorted = useMemo(() => sortDiagnoses(rows), [rows])
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR'
  const openWeb = () => void Linking.openURL(webPatientSectionTabUrl(patientId, 'clinical', 'diagnoses'))

  if (loading && rows.length === 0 && !error) return <StatePanel tokens={tokens} loading />
  if (error && rows.length === 0) return <StatePanel tokens={tokens} error={error} onRetry={() => void load()} />

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load() }} tintColor={tokens.colorPrimary} />
      }
    >
      <View>
        <Text style={[styles.title, { color: tokens.colorTextBase }]}>{t('clinical.diagnoses.title')}</Text>
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 14 }}>{t('clinical.diagnoses.subtitle')}</Text>
      </View>

      <Pressable
        onPress={openWeb}
        style={[styles.webHint, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
      >
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>{t('clinical.diagnoses.webHint')}</Text>
        <Text style={{ color: tokens.colorPrimary, fontWeight: '600' }}>{t('clinical.diagnoses.openWeb')}</Text>
      </Pressable>

      {sorted.length === 0 ? (
        <SectionCard title={t('clinical.listTitle')}>
          <Text style={{ color: tokens.colorTextSecondary }}>{t('clinical.diagnoses.empty')}</Text>
        </SectionCard>
      ) : (
        <SectionCard title={t('clinical.diagnoses.listCount', { count: sorted.length })}>
          <View style={styles.list}>
            {sorted.map((row) => (
              <View
                key={row.id}
                style={[styles.row, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
              >
                <Text style={[styles.itemName, { color: tokens.colorTextBase }]} numberOfLines={2}>
                  {row.diagnosisName}
                </Text>
                {row.diagnosisCode ? (
                  <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>{row.diagnosisCode}</Text>
                ) : null}
                <View style={styles.badges}>
                  {row.isChronic ? (
                    <Text style={[styles.badge, { borderColor: tokens.colorError, color: tokens.colorError }]}>
                      {t('clinical.diagnoses.chronic')}
                    </Text>
                  ) : null}
                  {row.status ? (
                    <Text style={[styles.badge, { borderColor: tokens.colorBorder, color: tokens.colorTextSecondary }]}>
                      {row.status}
                    </Text>
                  ) : null}
                </View>
                {row.diagnosedDate ? (
                  <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>
                    {formatClinicalDate(row.diagnosedDate, locale)}
                  </Text>
                ) : null}
                {row.description ? (
                  <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }} numberOfLines={3}>
                    {row.description}
                  </Text>
                ) : null}
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
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { fontSize: 11, fontWeight: '600', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
})
