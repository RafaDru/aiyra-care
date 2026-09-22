import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { SectionCard } from '@/components/family/SectionCard'
import { StatePanel } from '@/components/StatePanel'
import { useToast } from '@/contexts/ToastContext'
import { api } from '@/lib/api'
import type { OwnedPatient, PatientAccessGrant } from '@/lib/api.types'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export function PatientAccessGrantsSection() {
  const { t } = useTranslation()
  const toast = useToast()
  const { tokens } = useAiyraTheme()
  const [owned, setOwned] = useState<OwnedPatient[]>([])
  const [patientId, setPatientId] = useState<string | undefined>()
  const [grants, setGrants] = useState<PatientAccessGrant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOwned = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await api.familyAccess.listOwnedPatients()
      setOwned(rows)
      setPatientId((prev) => prev ?? rows[0]?.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('family.grants.loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  const loadGrants = useCallback(async () => {
    if (!patientId) {
      setGrants([])
      return
    }
    try {
      setGrants(await api.patientAccess.listGrants(patientId))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('family.grants.loadError'))
    }
  }, [patientId, t])

  useEffect(() => {
    void loadOwned()
  }, [loadOwned])

  useEffect(() => {
    void loadGrants()
  }, [loadGrants])

  const revoke = (grant: PatientAccessGrant) => {
    if (!patientId) return
    Alert.alert(t('family.grants.revokeTitle'), grant.email ?? grant.displayName ?? grant.accountId, [
      { text: t('family.grants.cancel'), style: 'cancel' },
      {
        text: t('family.grants.revokeConfirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await api.patientAccess.revokeGrant(patientId, grant.id)
              toast.success(t('family.grants.revoked'))
              await loadGrants()
            } catch (e) {
              toast.error(e instanceof Error ? e.message : t('family.grants.loadError'))
            }
          })()
        },
      },
    ])
  }

  if (loading && owned.length === 0) return <StatePanel tokens={tokens} loading />
  if (error && owned.length === 0) return <StatePanel tokens={tokens} error={error} onRetry={() => void loadOwned()} />

  return (
    <SectionCard title={t('family.grants.title')}>
      <Text style={{ color: tokens.colorTextSecondary, fontSize: 13, marginBottom: 8 }}>{t('family.grants.subtitle')}</Text>
      {owned.length === 0 ? (
        <Text style={{ color: tokens.colorTextSecondary }}>{t('family.grants.noPatients')}</Text>
      ) : (
        <>
          <View style={styles.chipRow}>
            {owned.map((p) => {
              const active = patientId === p.id
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setPatientId(p.id)}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? tokens.colorPrimary : tokens.colorBorder,
                      backgroundColor: active ? tokens.colorBgLayout : tokens.colorBgContainer,
                    },
                  ]}
                >
                  <Text style={{ color: active ? tokens.colorPrimary : tokens.colorTextBase, fontSize: 13 }} numberOfLines={1}>
                    {p.name}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          {grants.length === 0 ? (
            <Text style={{ color: tokens.colorTextSecondary, marginTop: 8 }}>{t('family.grants.empty')}</Text>
          ) : (
            <View style={styles.list}>
              {grants.map((g) => (
                <View
                  key={g.id}
                  style={[styles.row, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: tokens.colorTextBase, fontWeight: '600' }}>
                      {g.displayName ?? g.email ?? g.accountId}
                    </Text>
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>
                      {g.membershipRole} · {g.accessLevel}
                    </Text>
                  </View>
                  <Pressable onPress={() => revoke(g)}>
                    <Text style={{ color: tokens.colorError, fontWeight: '600', fontSize: 13 }}>
                      {t('family.grants.revokeConfirm')}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </SectionCard>
  )
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, maxWidth: '48%' },
  list: { gap: 8, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 12 },
})
