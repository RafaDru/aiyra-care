import { useCallback, useEffect, useMemo, useState } from 'react'
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SectionCard } from '@/components/family/SectionCard'
import { StatePanel } from '@/components/StatePanel'
import { WalletCardFace } from '@/components/wallet/WalletCardFace'
import { api } from '@/lib/api'
import type { IntegrationLink, Patient, PlanMembershipWithPlan } from '@/lib/api.types'
import {
  formatCardNumber,
  formatCns,
  formatCpf,
  INSURANCE_PORTALS,
} from '@/lib/wallet-format'
import { webPatientPlanTabUrl } from '@/lib/web-app-url'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = {
  patientId: string
}

function membershipForLink(
  memberships: PlanMembershipWithPlan[],
  link: IntegrationLink,
): PlanMembershipWithPlan | undefined {
  return (
    memberships.find((m) => m.integrationLinkId === link.id) ??
    memberships.find((m) => m.source === link.portalType || m.plan?.operator === link.portalType)
  )
}

function formatLastSync(iso: string | null | undefined): string | null {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return null
  }
}

export function PatientWalletTab({ patientId }: Props) {
  const { tokens } = useAiyraTheme()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [links, setLinks] = useState<IntegrationLink[]>([])
  const [memberships, setMemberships] = useState<PlanMembershipWithPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [p, linkRows, membershipRows] = await Promise.all([
        api.patients.get(patientId),
        api.integrationLinks.list(patientId),
        api.planMemberships.list(patientId),
      ])
      setPatient(p)
      setLinks(linkRows)
      setMemberships(membershipRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar carteira')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [patientId])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const insuranceLinks = useMemo(
    () => links.filter((l) => INSURANCE_PORTALS.has(l.portalType)),
    [links],
  )

  const firstName = patient?.name.trim().split(/\s+/)[0] ?? 'paciente'
  const showCaderneta =
    patient?.ageCategory === 'children' ||
    patient?.ageCategory === 'adolescents'

  const openWebWallet = () => void Linking.openURL(webPatientPlanTabUrl(patientId, 'wallet'))

  if (loading && !patient) {
    return <StatePanel tokens={tokens} loading />
  }

  if (error && !patient) {
    return <StatePanel tokens={tokens} error={error} onRetry={() => void load()} />
  }

  if (!patient) {
    return <StatePanel tokens={tokens} emptyMessage="Paciente não encontrado." />
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
        <Text style={[styles.title, { color: tokens.colorTextBase }]}>
          Carteira de {firstName}
        </Text>
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 14 }}>
          Cartões e convênios sincronizados — somente leitura no app mobile.
        </Text>
      </View>

      <Pressable
        onPress={openWebWallet}
        style={[styles.webHint, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
      >
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>
          QR token Unimed, sincronização e coparticipação detalhada ficam no app web.
        </Text>
        <Text style={{ color: tokens.colorPrimary, fontWeight: '600', fontSize: 14 }}>Abrir Carteira no navegador</Text>
      </Pressable>

      <SectionCard title="Sistema público">
        <View style={styles.cardStack}>
          <WalletCardFace
            brandKey="conectesus"
            holderName={patient.name}
            numberLabel="CNS"
            numberValue={patient.cns ? formatCns(patient.cns) : '—'}
            statusLabel={patient.cns ? 'Ativo' : 'Pendente'}
            statusTone={patient.cns ? 'active' : 'pending'}
          />
          <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>
            CPF {formatCpf(patient.cpf ?? null)}
          </Text>
        </View>
        {showCaderneta ? (
          <View style={[styles.cardStack, { marginTop: 16 }]}>
            <WalletCardFace
              brandKey="caderneta"
              holderName={patient.name}
              numberLabel="Caderneta"
              numberValue="Minha família"
              statusLabel="gov.br"
              statusTone="pending"
            />
            <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>
              Calendário vacinal e marcos — ver detalhes no web.
            </Text>
          </View>
        ) : null}
      </SectionCard>

      <SectionCard title="Plano de saúde">
        {insuranceLinks.length === 0 ? (
          <Text style={{ color: tokens.colorTextSecondary }}>
            Nenhum convênio vinculado. Conecte um portal na aba Integrações (web) e sincronize.
          </Text>
        ) : (
          <View style={styles.cardStack}>
            {insuranceLinks.map((link) => {
              const membership = membershipForLink(memberships, link)
              const cardNum =
                formatCardNumber(link.cardNumber || membership?.memberNumber) ?? '—'
              const lastSync = formatLastSync(link.effectiveLastSyncAt ?? link.lastSyncAt)
              return (
                <View key={link.id} style={styles.cardBlock}>
                  <WalletCardFace
                    brandKey={link.portalType}
                    planLabel={membership?.plan?.planName}
                    holderName={patient.name}
                    numberLabel="Número do cartão"
                    numberValue={cardNum}
                    statusLabel={link.active ? 'Ativo' : 'Inativo'}
                    statusTone={link.active ? 'active' : 'inactive'}
                  />
                  {membership?.plan?.networkName ? (
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>
                      Rede: {membership.plan.networkName}
                    </Text>
                  ) : null}
                  {lastSync ? (
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>
                      Atualizado em {lastSync}
                    </Text>
                  ) : (
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>
                      Ainda sem sync — use o app web para importar o cartão.
                    </Text>
                  )}
                </View>
              )
            })}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Plano odontológico">
        <Text style={{ color: tokens.colorTextSecondary }}>Nenhum plano odontológico cadastrado.</Text>
      </SectionCard>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  webHint: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  cardStack: { gap: 8 },
  cardBlock: { gap: 6, marginBottom: 12 },
})
