import { useCallback, useEffect, useMemo, useState } from 'react'
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { SectionCard } from '@/components/family/SectionCard'
import { StatePanel } from '@/components/StatePanel'
import { api } from '@/lib/api'
import type { Medication } from '@/lib/api.types'
import {
  formatClinicalDate,
  medicationDisplayName,
  medicationSubtitle,
} from '@/lib/clinical-format'
import { webPatientSectionTabUrl } from '@/lib/web-app-url'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = {
  patientId: string
}

function sortMedications(rows: Medication[]): Medication[] {
  return [...rows].sort((a, b) => {
    const anchor = (m: Medication) => m.startedAt ?? m.startDate ?? m.createdAt
    const ta = new Date(anchor(a)).getTime()
    const tb = new Date(anchor(b)).getTime()
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta)
  })
}

export function PatientMedicationsTab({ patientId }: Props) {
  const { t, i18n } = useTranslation()
  const { tokens } = useAiyraTheme()
  const [medications, setMedications] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const rows = await api.medications.list(patientId)
      setMedications(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('clinical.medications.loadError'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [patientId, t])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const sorted = useMemo(() => sortMedications(medications), [medications])
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR'

  const openWeb = () => void Linking.openURL(webPatientSectionTabUrl(patientId, 'clinical', 'medications'))

  if (loading && medications.length === 0 && !error) {
    return <StatePanel tokens={tokens} loading />
  }

  if (error && medications.length === 0) {
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
        <Text style={[styles.title, { color: tokens.colorTextBase }]}>{t('clinical.medications.title')}</Text>
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 14 }}>{t('clinical.medications.subtitle')}</Text>
      </View>

      <Pressable
        onPress={openWeb}
        style={[styles.webHint, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
      >
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>{t('clinical.medications.webHint')}</Text>
        <Text style={{ color: tokens.colorPrimary, fontWeight: '600', fontSize: 14 }}>
          {t('clinical.medications.openWeb')}
        </Text>
      </Pressable>

      {sorted.length === 0 ? (
        <SectionCard title={t('clinical.listTitle')}>
          <Text style={{ color: tokens.colorTextSecondary }}>{t('clinical.medications.empty')}</Text>
        </SectionCard>
      ) : (
        <SectionCard title={t('clinical.medications.listCount', { count: sorted.length })}>
          <View style={styles.list}>
            {sorted.map((med) => {
              const subtitle = medicationSubtitle(med)
              const start = med.startedAt ?? med.startDate
              const end = med.endDate
              return (
                <View
                  key={med.id}
                  style={[styles.row, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
                >
                  <View style={styles.rowHeader}>
                    <Text style={[styles.itemName, { color: tokens.colorTextBase }]} numberOfLines={2}>
                      {medicationDisplayName(med.genericName, med.brandName)}
                    </Text>
                    <Text
                      style={[
                        styles.statusBadge,
                        {
                          color: med.isActive ? tokens.colorSuccess : tokens.colorTextSecondary,
                          borderColor: med.isActive ? tokens.colorSuccess : tokens.colorBorder,
                        },
                      ]}
                    >
                      {med.isActive ? t('clinical.medications.active') : t('clinical.medications.inactive')}
                    </Text>
                  </View>
                  {subtitle ? (
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }} numberOfLines={2}>
                      {subtitle}
                    </Text>
                  ) : null}
                  {start || end ? (
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>
                      {start ? formatClinicalDate(start, locale) : '—'}
                      {end
                        ? ` → ${formatClinicalDate(end, locale)}${med.endDateIsProjected ? ` (${t('clinical.medications.projected')})` : ''}`
                        : ''}
                    </Text>
                  ) : null}
                  {med.prescribingDoctor ? (
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }} numberOfLines={1}>
                      {t('clinical.medications.prescriber', { name: med.prescribingDoctor })}
                    </Text>
                  ) : null}
                  {med.notes ? (
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }} numberOfLines={3}>
                      {med.notes}
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
  statusBadge: {
    fontSize: 11,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
})
