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
import { DUAL_ENTRY_SCROLL_BOTTOM_PADDING } from '@/lib/dual-entry-layout'
import { resolveHomeGreetingName } from '@/lib/input-masks'
import { groupPatientsByAgeCategory } from '@/lib/patient-list-labels'
import { primePatientRefs, refForPatient } from '@/lib/patient-route-ref'
import { HomePatientCard } from '@/components/home/HomePatientCard'
import { HomeSectionHeader } from '@/components/home/HomeSectionHeader'
import { StatePanel } from '@/components/StatePanel'
import { NoticeBanner } from '@/components/ui/NoticeBanner'
import { HomeAddPatientSheet } from '@/components/patient/HomeAddPatientSheet'
import { useAuth } from '@/contexts/AuthContext'
import { AIYRA_FONT_BOLD, AIYRA_FONT_REGULAR, AIYRA_FONT_SEMIBOLD } from '@/theme/useAiyraFonts'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Row =
  | { type: 'header'; key: string; title: string; count: number }
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
      setError(e instanceof Error ? e.message : t('patient.loadListFailed'))
    } finally {
      if (mode === 'refresh') setRefreshing(false)
      else setLoading(false)
    }
  }, [t])

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
      out.push({
        type: 'header',
        key: `h-${section.key}`,
        title: t(section.labelKey),
        count: section.items.length,
      })
      for (const patient of section.items) {
        out.push({ type: 'patient', key: patient.id, patient })
      }
    }
    return out
  }, [patients, t])

  const showListLoader = configured && (authLoading || syncing || (loading && !refreshing))

  const greetingName = useMemo(() => {
    const self = patients.find((p) => p.isSelf || p.membershipRole === 'self')
    return resolveHomeGreetingName(account?.displayName, self?.name)
  }, [account?.displayName, patients])

  return (
    <View style={[styles.screen, { backgroundColor: tokens.colorBgLayout }]}>
      <Text style={[styles.greeting, { color: tokens.colorTextBase, fontFamily: AIYRA_FONT_BOLD }]}>
        {greetingName ? t('home.greeting', { name: greetingName }) : t('home.greetingGeneric')}
      </Text>
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={[styles.pageTitle, { color: tokens.colorTextBase, fontFamily: AIYRA_FONT_BOLD }]}>
            {t('dashboard.peopleTitle')}
          </Text>
          <Text style={[styles.pageSubtitle, { color: tokens.colorTextSecondary, fontFamily: AIYRA_FONT_REGULAR }]}>
            {t('dashboard.peopleSubtitle')}
          </Text>
        </View>
        {configured && authUserId ? (
          <Pressable
            onPress={() => setAddOpen(true)}
            style={[styles.addBtn, { borderColor: tokens.colorPrimary, backgroundColor: tokens.colorBgContainer }]}
          >
            <Text style={{ color: tokens.colorPrimary, fontWeight: '700', fontSize: 13, fontFamily: AIYRA_FONT_SEMIBOLD }}>
              {t('patient.addPerson')}
            </Text>
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
        <StatePanel tokens={tokens} error={t('auth.signInRequired')} />
      ) : null}

      {configured && authUserId ? (
        showListLoader ? (
          <StatePanel tokens={tokens} loading />
        ) : error ? (
          <StatePanel tokens={tokens} error={error} onRetry={() => void load('initial')} />
        ) : patients.length === 0 ? (
          <StatePanel tokens={tokens} emptyMessage={t('patient.emptyFamily')} />
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
            contentContainerStyle={{ gap: 12, paddingBottom: DUAL_ENTRY_SCROLL_BOTTOM_PADDING }}
            renderItem={({ item }) => {
              if (item.type === 'header') {
                return <HomeSectionHeader title={item.title} count={item.count} tokens={tokens} />
              }
              const p = item.patient
              return (
                <HomePatientCard
                  patient={p}
                  tokens={tokens}
                  onPress={() => router.push(`/(app)/patient/${refForPatient(p.id)}`)}
                />
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
  greeting: { fontSize: 15, marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  titleBlock: { flex: 1 },
  pageTitle: { fontSize: 22, fontWeight: '700' },
  pageSubtitle: { fontSize: 14, marginTop: 2 },
  addBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, maxWidth: '42%' },
  inlineLoader: { marginTop: 24, alignItems: 'center' },
})
