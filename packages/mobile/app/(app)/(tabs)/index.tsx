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
import { groupPatientsByAgeCategory } from '@/lib/patient-list-labels'
import { StatePanel } from '@/components/StatePanel'
import { NoticeBanner } from '@/components/ui/NoticeBanner'
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

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const list = await api.patients.list()
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

  return (
    <View style={[styles.screen, { backgroundColor: tokens.colorBgLayout }]}>
      <Text style={[styles.greeting, { color: tokens.colorTextBase }]}>
        Olá{account?.displayName ? `, ${account.displayName}` : ''}
      </Text>
      <Text style={[styles.subtitle, { color: tokens.colorTextSecondary }]}>Perfis de saúde</Text>

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
            emptyMessage="Nenhum perfil de saúde ainda. Crie um perfil no web para começar."
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
                  onPress={() => router.push(`/(app)/patient/${p.id}`)}
                  style={[styles.card, { backgroundColor: tokens.colorBgContainer, borderColor: tokens.colorBorder }]}
                >
                  <Text style={[styles.name, { color: tokens.colorTextBase }]}>{p.name}</Text>
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
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  greeting: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginTop: 8, marginBottom: 2 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14 },
  name: { fontSize: 17, fontWeight: '600' },
  inlineLoader: { marginTop: 24, alignItems: 'center' },
})
