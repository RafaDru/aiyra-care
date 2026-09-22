import { useCallback, useEffect, useMemo, useState } from 'react'
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { SectionCard } from '@/components/family/SectionCard'
import { StatePanel } from '@/components/StatePanel'
import { api } from '@/lib/api'
import type { Authorization } from '@/lib/api.types'
import { formatClinicalDate, formatRecordSource } from '@/lib/clinical-format'
import { webPatientSectionTabUrl } from '@/lib/web-app-url'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = { patientId: string }

const STATUS_LABEL: Record<string, string> = {
  authorized: 'Autorizado',
  used: 'Utilizado',
  expired: 'Expirado',
  cancelled: 'Cancelado',
}

function sortAuthorizations(rows: Authorization[]): Authorization[] {
  return [...rows].sort((a, b) => {
    const ta = a.authorizationDate ? new Date(a.authorizationDate).getTime() : 0
    const tb = b.authorizationDate ? new Date(b.authorizationDate).getTime() : 0
    return tb - ta
  })
}

export function PatientAuthorizationsTab({ patientId }: Props) {
  const { t, i18n } = useTranslation()
  const { tokens } = useAiyraTheme()
  const [rows, setRows] = useState<Authorization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      setRows(await api.authorizations.list(patientId))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('clinical.authorizations.loadError'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [patientId, t])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const sorted = useMemo(() => sortAuthorizations(rows), [rows])
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR'
  const openWeb = () => void Linking.openURL(webPatientSectionTabUrl(patientId, 'clinical', 'authorizations'))

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
        <Text style={[styles.title, { color: tokens.colorTextBase }]}>{t('clinical.authorizations.title')}</Text>
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 14 }}>{t('clinical.authorizations.subtitle')}</Text>
      </View>

      <Pressable
        onPress={openWeb}
        style={[styles.webHint, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
      >
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>{t('clinical.authorizations.webHint')}</Text>
        <Text style={{ color: tokens.colorPrimary, fontWeight: '600' }}>{t('clinical.authorizations.openWeb')}</Text>
      </Pressable>

      {sorted.length === 0 ? (
        <SectionCard title={t('clinical.listTitle')}>
          <Text style={{ color: tokens.colorTextSecondary }}>{t('clinical.authorizations.empty')}</Text>
        </SectionCard>
      ) : (
        <SectionCard title={t('clinical.authorizations.listCount', { count: sorted.length })}>
          <View style={styles.list}>
            {sorted.map((row) => {
              const statusLabel = STATUS_LABEL[row.status] ?? row.status
              const title = row.classification || row.procedureDescription || row.solicitationNumber || row.guideNumber || '—'
              return (
                <View
                  key={row.id}
                  style={[styles.row, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
                >
                  <View style={styles.rowHeader}>
                    <Text style={[styles.itemName, { color: tokens.colorTextBase }]} numberOfLines={2}>{title}</Text>
                    <Text style={{ color: tokens.colorPrimary, fontSize: 12, fontWeight: '600' }}>{statusLabel}</Text>
                  </View>
                  {row.authorizationDate ? (
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>
                      {formatClinicalDate(row.authorizationDate, locale)}
                      {row.validityDate ? ` → ${formatClinicalDate(row.validityDate, locale)}` : ''}
                    </Text>
                  ) : null}
                  {row.doctorName || row.specialty ? (
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }} numberOfLines={2}>
                      {[row.doctorName, row.specialty].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                  <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>
                    {t('clinical.source', { source: formatRecordSource(row.source) })}
                  </Text>
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
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
  itemName: { fontSize: 16, fontWeight: '600', flex: 1 },
})
