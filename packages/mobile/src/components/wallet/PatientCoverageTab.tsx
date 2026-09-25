import { useCallback, useEffect, useState } from 'react'
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SectionCard } from '@/components/family/SectionCard'
import { StatePanel } from '@/components/StatePanel'
import { api } from '@/lib/api'
import type { IntegrationLink, PlanMembershipWithPlan } from '@/lib/api.types'
import { formatCardNumber, walletBrandMeta } from '@/lib/wallet-format'
import { webPatientPlanTabUrl } from '@/lib/web-app-url'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = {
  patientId: string
}

function detailLines(m: PlanMembershipWithPlan): string[] {
  const lines: string[] = []
  if (m.plan?.productCode) lines.push(`ANS: ${m.plan.productCode}`)
  if (m.plan?.networkName) lines.push(`Rede: ${m.plan.networkName}`)
  if (m.plan?.operatorName) lines.push(`Operadora: ${m.plan.operatorName}`)
  if (m.status) lines.push(`Status: ${m.status}`)
  return lines
}

export function PatientCoverageTab({ patientId }: Props) {
  const { tokens } = useAiyraTheme()
  const [links, setLinks] = useState<IntegrationLink[]>([])
  const [memberships, setMemberships] = useState<PlanMembershipWithPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [linkRows, membershipRows] = await Promise.all([
        api.integrationLinks.list(patientId),
        api.planMemberships.list(patientId),
      ])
      setLinks(linkRows)
      setMemberships(membershipRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar convênios')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [patientId])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const openWeb = () => {
    const url = webPatientPlanTabUrl(patientId, 'coverage')
    void Linking.openURL(url)
  }

  if (loading) {
    return <StatePanel tokens={tokens} loading />
  }

  if (error) {
    return <StatePanel tokens={tokens} error={error} onRetry={() => void load()} />
  }

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load() }} />
      }
      contentContainerStyle={styles.content}
    >
      <Pressable onPress={openWeb} style={[styles.webLink, { borderColor: tokens.colorBorder }]}>
        <Text style={{ color: tokens.colorPrimary, fontWeight: '600' }}>Abrir Convênios no navegador</Text>
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 12, marginTop: 4 }}>
          Vincular plano e cartão virtual — edição completa no web.
        </Text>
      </Pressable>

      {memberships.length === 0 ? (
        <SectionCard title="Nenhum convênio">
          <Text style={{ color: tokens.colorTextSecondary }}>
            Sincronize integrações no web ou vincule um plano na aba Convênios.
          </Text>
        </SectionCard>
      ) : (
        memberships.map((m) => {
          const brand = m.plan?.operator ?? m.source ?? 'plano'
          const meta = walletBrandMeta(brand)
          const link =
            links.find((l) => l.id === m.integrationLinkId) ??
            links.find((l) => l.portalType === brand)
          const synced = m.lastSyncedAt
            ? new Date(m.lastSyncedAt).toLocaleDateString('pt-BR')
            : '—'
          const card = formatCardNumber(m.memberNumber) ?? m.memberNumber ?? '—'
          const extras = detailLines(m)

          return (
            <SectionCard key={m.id} title={meta.label}>
              <Text style={[styles.planName, { color: tokens.colorTextBase }]}>
                {m.plan?.planName ?? 'Plano'}
              </Text>
              <View style={styles.row}>
                <Text style={{ color: tokens.colorTextSecondary }}>Carteirinha</Text>
                <Text style={{ color: tokens.colorTextBase, fontWeight: '600' }}>{card}</Text>
              </View>
              <View style={styles.row}>
                <Text style={{ color: tokens.colorTextSecondary }}>Última sync</Text>
                <Text style={{ color: tokens.colorTextBase }}>{synced}</Text>
              </View>
              {link && (
                <View style={styles.row}>
                  <Text style={{ color: tokens.colorTextSecondary }}>Integração</Text>
                  <Text style={{ color: tokens.colorTextBase }}>{link.portalType}</Text>
                </View>
              )}
              {extras.map((line) => (
                <Text key={line} style={{ color: tokens.colorTextSecondary, fontSize: 13, marginTop: 4 }}>
                  {line}
                </Text>
              ))}
            </SectionCard>
          )
        })
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 48 },
  webLink: { borderWidth: 1, borderRadius: 12, padding: 14 },
  planName: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
})
