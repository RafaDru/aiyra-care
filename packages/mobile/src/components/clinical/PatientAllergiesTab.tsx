import { useCallback, useEffect, useMemo, useState } from 'react'
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { SectionCard } from '@/components/family/SectionCard'
import { StatePanel } from '@/components/StatePanel'
import { api } from '@/lib/api'
import type { Allergy } from '@/lib/api.types'
import { allergySeverityKey, formatClinicalDate } from '@/lib/clinical-format'
import { webPatientSectionTabUrl } from '@/lib/web-app-url'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = {
  patientId: string
}

function sortAllergies(rows: Allergy[]): Allergy[] {
  return [...rows].sort((a, b) => a.allergen.localeCompare(b.allergen, 'pt-BR'))
}

export function PatientAllergiesTab({ patientId }: Props) {
  const { t, i18n } = useTranslation()
  const { tokens } = useAiyraTheme()
  const [allergies, setAllergies] = useState<Allergy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const rows = await api.allergies.list(patientId)
      setAllergies(rows)
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

  if (loading && allergies.length === 0 && !error) {
    return <StatePanel tokens={tokens} loading />
  }

  if (error && allergies.length === 0) {
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
        <Text style={[styles.title, { color: tokens.colorTextBase }]}>{t('clinical.allergies.title')}</Text>
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 14 }}>{t('clinical.allergies.subtitle')}</Text>
      </View>

      <Pressable
        onPress={openWeb}
        style={[styles.webHint, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
      >
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>{t('clinical.allergies.webHint')}</Text>
        <Text style={{ color: tokens.colorPrimary, fontWeight: '600', fontSize: 14 }}>
          {t('clinical.allergies.openWeb')}
        </Text>
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
              const severityLabel = severityKey
                ? t(`clinical.allergies.severity_${severityKey}`)
                : row.severity
              const severityColor =
                severityKey === 'severe'
                  ? tokens.colorError
                  : severityKey === 'moderate'
                    ? tokens.colorWarning
                    : tokens.colorSuccess
              return (
                <View
                  key={row.id}
                  style={[styles.row, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
                >
                  <View style={styles.rowHeader}>
                    <Text style={[styles.itemName, { color: tokens.colorTextBase }]} numberOfLines={2}>
                      {row.allergen}
                    </Text>
                    {severityLabel ? (
                      <Text
                        style={[
                          styles.severityBadge,
                          { color: severityColor, borderColor: severityColor },
                        ]}
                      >
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
                  {row.notes ? (
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }} numberOfLines={3}>
                      {row.notes}
                    </Text>
                  ) : null}
                </View>
              )
            })}
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
})
