import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import type { Patient } from '@/lib/api.types'
import { api } from '@/lib/api'
import { resolveHomeGreetingName } from '@/lib/input-masks'
import { groupPatientsByAgeCategory } from '@/lib/patient-list-labels'
import { primePatientRefs, refForPatient } from '@/lib/patient-route-ref'
import { StatePanel } from '@/components/StatePanel'
import { NoticeBanner } from '@/components/ui/NoticeBanner'
import { HomeAddPatientSheet } from '@/components/patient/HomeAddPatientSheet'
import { useAuth } from '@/contexts/AuthContext'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Row =
  | { type: 'header'; key: string; title: string }
  | { type: 'patient'; key: string; patient: Patient }

export default function HomeScreen() {
  const { t } = useTranslation()
  const { configured, loading: authLoading, syncing, authUserId, account, needsProfile } = useAuth()
  const { tokens } = useAiyraTheme()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const list = await api.patients.list()
      primePatientRefs(list)
      setPatients(list)
    } catch (e) {
      setPatients([])
      setError(e instanceof Error ? e.message : 'Erro ao carregar pacientes')
    } finally {
      if (mode === 'refresh') setRefreshing(false)
      else setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!configured || authLoading || !authUserId) {
      if (!authLoading) setLoading(false)
      return
    }
    void load('initial')
  }, [configured, authLoading, authUserId, load])

  const rows = useMemo((): Row[] => {
    const sections = groupPatientsByAgeCategory(patients)
    const out: Row[] = []
    for (const section of sections) {
      out.push({ type: 'header', key: `h-${section.key}`, title: section.label })
      for (const patient of section.items) {
        out.push({ type: 'patient', key: patient.id, patient })
      }
    }
    return out
  }, [patients])

  const showListLoader = configured && (authLoading || syncing || (loading && !refreshing))

  const greetingName = useMemo(() => {
    const self = patients.find((p) => p.isSelf || p.membershipRole === 'self')
    return resolveHomeGreetingName(account?.displayName, self?.name)
  }, [account?.displayName, patients])

  return (
    <View style={[styles.screen, { backgroundColor: tokens.colorBgLayout }]}>
      <Text style={[styles.greeting, { color: tokens.colorTextBase }]}>
        {greetingName ? t('home.greeting', { name: greetingName }) : t('home.greetingGeneric')}
      </Text>
      <View style={styles.titleRow}>
        <Text style={[styles.subtitle, { color: tokens.colorTextSecondary, marginBottom: 0 }]}>Perfis de saúde</Text>
        {configured && authUserId ? (
          <Pressable onPress={() => setAddOpen(true)} style={[styles.addBtn, { borderColor: tokens.colorPrimary }]}>
            <Text style={{ color: tokens.colorPrimary, fontWeight: '700', fontSize: 14 }}>{t('patient.home.add')}</Text>
          </Pressable>
        ) : null}
      </View>

      {!configured ? (
        <StatePanel
          tokens={tokens}
          error="Configure EXPO_PUBLIC_SUPABASE_* e EXPO_PUBLIC_API_URL (copie .env.example)."
        />
      ) : null}

      {configured && needsProfile ? (
        <NoticeBanner
          tokens={tokens}
          tone="warning"
          actionLabel={t('onboarding.bannerAction')}
          onAction={() => router.push('/(app)/onboarding')}
        >
          {`${t('onboarding.bannerTitle')}\n${t('onboarding.bannerBody')}`}
        </NoticeBanner>
      ) : null}

      {configured && !authLoading && !authUserId ? (
        <StatePanel tokens={tokens} error="Faça login para ver seus perfis." />
      ) : null}

      {configured && authUserId ? (
        showListLoader ? (
          <StatePanel tokens={tokens} loading />
        ) : error ? (
          <StatePanel tokens={tokens} error={error} onRetry={() => void load('initial')} />
        ) : patients.length === 0 ? (
          <StatePanel
            tokens={tokens}
            emptyMessage={t('patient.home.empty')}
          />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(row) => row.key}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void load('refresh')}
                tintColor={tokens.colorPrimary}
              />
            }
            contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
            renderItem={({ item }) => {
              if (item.type === 'header') {
                return (
                  <Text style={[styles.sectionTitle, { color: tokens.colorTextSecondary }]}>{item.title}</Text>
                )
              }
              const p = item.patient
              return (
                <Pressable
                  onPress={() => router.push(`/(app)/patient/${refForPatient(p.id)}`)}
                  style={[styles.card, { backgroundColor: tokens.colorBgContainer, borderColor: tokens.colorBorder }]}
                >
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.name, { color: tokens.colorTextBase, flex: 1 }]}>{p.name}</Text>
                    {p.isSelf || p.membershipRole === 'self' ? (
                      <View style={[styles.youTag, { backgroundColor: tokens.colorPrimary }]}>
                        <Text style={styles.youTagText}>{t('patient.you')}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>
                    {p.gender === 'female' ? 'Feminino' : p.gender === 'male' ? 'Masculino' : 'Perfil'}
                  </Text>
                </Pressable>
              )
            }}
          />
        )
      ) : null}

      {configured && authLoading ? (
        <View style={styles.inlineLoader}>
          <ActivityIndicator color={tokens.colorPrimary} />
        </View>
      ) : null}

      <HomeAddPatientSheet visible={addOpen} onClose={() => setAddOpen(false)} onCreated={() => void load('refresh')} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  greeting: { fontSize: 22, fontWeight: '700' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 12 },
  subtitle: { fontSize: 14, flex: 1 },
  addBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginTop: 8, marginBottom: 2 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 17, fontWeight: '600' },
  youTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  youTagText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  inlineLoader: { marginTop: 24, alignItems: 'center' },
})
