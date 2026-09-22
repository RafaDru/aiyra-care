import { useCallback, useEffect, useMemo, useState } from 'react'
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { SectionCard } from '@/components/family/SectionCard'
import { StatePanel } from '@/components/StatePanel'
import { api } from '@/lib/api'
import type { MedicalRecord } from '@/lib/api.types'
import { formatClinicalDate, formatCurrencyBrl, formatRecordSource } from '@/lib/clinical-format'
import { webPatientSectionTabUrl } from '@/lib/web-app-url'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = {
  patientId: string
}

function sortRecords(rows: MedicalRecord[]): MedicalRecord[] {
  return [...rows].sort((a, b) => {
    const ta = new Date(a.recordDate).getTime()
    const tb = new Date(b.recordDate).getTime()
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta)
  })
}

export function PatientMedicalRecordsTab({ patientId }: Props) {
  const { t, i18n } = useTranslation()
  const { tokens } = useAiyraTheme()
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const rows = await api.medicalRecords.list(patientId)
      setRecords(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('clinical.records.loadError'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [patientId, t])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const sorted = useMemo(() => sortRecords(records), [records])
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR'

  const openWeb = () => void Linking.openURL(webPatientSectionTabUrl(patientId, 'clinical', 'records'))

  if (loading && records.length === 0 && !error) {
    return <StatePanel tokens={tokens} loading />
  }

  if (error && records.length === 0) {
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
        <Text style={[styles.title, { color: tokens.colorTextBase }]}>{t('clinical.records.title')}</Text>
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 14 }}>{t('clinical.records.subtitle')}</Text>
      </View>

      <Pressable
        onPress={openWeb}
        style={[styles.webHint, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
      >
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>{t('clinical.records.webHint')}</Text>
        <Text style={{ color: tokens.colorPrimary, fontWeight: '600', fontSize: 14 }}>
          {t('clinical.records.openWeb')}
        </Text>
      </Pressable>

      {sorted.length === 0 ? (
        <SectionCard title={t('clinical.listTitle')}>
          <Text style={{ color: tokens.colorTextSecondary }}>{t('clinical.records.empty')}</Text>
        </SectionCard>
      ) : (
        <SectionCard title={t('clinical.records.listCount', { count: sorted.length })}>
          <View style={styles.list}>
            {sorted.map((row) => {
              const amount = formatCurrencyBrl(row.chargedAmount)
              return (
                <View
                  key={row.id}
                  style={[styles.row, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
                >
                  <View style={styles.rowHeader}>
                    <Text style={[styles.itemName, { color: tokens.colorTextBase }]} numberOfLines={2}>
                      {row.recordType}
                    </Text>
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>
                      {formatClinicalDate(row.recordDate, locale)}
                    </Text>
                  </View>
                  {row.doctorName || row.specialty ? (
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }} numberOfLines={2}>
                      {[row.doctorName, row.specialty].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                  {row.clinicName ? (
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }} numberOfLines={1}>
                      {row.clinicName}
                    </Text>
                  ) : null}
                  {row.description ? (
                    <Text style={{ color: tokens.colorTextBase, fontSize: 14 }} numberOfLines={4}>
                      {row.description}
                    </Text>
                  ) : null}
                  <View style={styles.metaRow}>
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>
                      {t('clinical.source', { source: formatRecordSource(row.source) })}
                    </Text>
                    {amount ? (
                      <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>{amount}</Text>
                    ) : null}
                  </View>
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
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 4 },
})
