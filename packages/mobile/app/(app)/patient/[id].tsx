import { useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { PatientExamsTab } from '@/components/clinical/PatientExamsTab'
import { PatientIntegrationsPanel } from '@/components/integrations/PatientIntegrationsPanel'
import { PatientCoverageTab } from '@/components/wallet/PatientCoverageTab'
import { PatientWalletTab } from '@/components/wallet/PatientWalletTab'
import { PatientNavPicker } from '@/components/PatientNavPicker'
import { PlaceholderTab } from '@/components/PlaceholderTab'
import { api } from '@/lib/api'
import {
  defaultTabForSection,
  resolvePatientNav,
  type PatientSection,
  type PatientTabKey,
} from '@/lib/patient-navigation'
import { patientIdFromRouteParam } from '@/lib/patient-route-ref'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

function tabContent(tab: PatientTabKey): { title: string; subtitle: string } {
  switch (tab) {
    case 'wallet':
      return {
        title: 'Carteira',
        subtitle: 'Cartões virtuais e coparticipação — paridade com aba Carteira no web.',
      }
    case 'coverage':
      return {
        title: 'Convênios',
        subtitle: 'Planos vinculados e elegibilidade.',
      }
    case 'exams':
      return {
        title: 'Exames',
        subtitle: 'Lista, marcadores e laudos — portar de ExamsTab.tsx.',
      }
    case 'basic':
      return { title: 'Dados básicos', subtitle: 'Identidade e medidas do perfil.' }
    default:
      return {
        title: 'Em breve',
        subtitle: `Conteúdo da aba «${tab}» será portado do web.`,
      }
  }
}

function PatientHeader({
  title,
  section,
  tab,
  onSectionChange,
  onTabChange,
}: {
  title: string
  section: PatientSection
  tab: PatientTabKey
  onSectionChange: (s: PatientSection) => void
  onTabChange: (t: PatientTabKey) => void
}) {
  const { tokens } = useAiyraTheme()
  return (
    <View style={styles.header}>
      <Text style={[styles.patientTitle, { color: tokens.colorTextBase }]}>{title}</Text>
      <PatientNavPicker
        section={section}
        tab={tab}
        onSectionChange={onSectionChange}
        onTabChange={onTabChange}
      />
    </View>
  )
}

export default function PatientDetailScreen() {
  const { id, section: sectionParam, tab: tabParam } = useLocalSearchParams<{
    id: string
    section?: string
    tab?: string
  }>()
  const routeParam = typeof id === 'string' ? id : id?.[0] ?? ''
  const patientId = patientIdFromRouteParam(routeParam) ?? ''
  const { tokens } = useAiyraTheme()
  const [patientName, setPatientName] = useState<string>('Perfil')
  const initial = useMemo(
    () => resolvePatientNav(sectionParam ?? null, tabParam ?? null),
    [sectionParam, tabParam],
  )
  const [section, setSection] = useState<PatientSection>(initial.section)
  const [tab, setTab] = useState<PatientTabKey>(initial.tab)

  useEffect(() => {
    if (!patientId) return
    void api.patients
      .get(patientId)
      .then((p) => setPatientName(p.name))
      .catch(() => setPatientName('Perfil'))
  }, [patientId])

  const onSectionChange = (next: PatientSection) => {
    setSection(next)
    setTab(defaultTabForSection(next))
  }

  const content = tabContent(tab)

  if (!patientId) {
    return (
      <View style={{ flex: 1, padding: 16, backgroundColor: tokens.colorBgLayout }}>
        <Text style={{ color: tokens.colorTextSecondary }}>Perfil não encontrado.</Text>
      </View>
    )
  }

  if (tab === 'coverage') {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.colorBgLayout }}>
        <PatientHeader
          title={patientName}
          section={section}
          tab={tab}
          onSectionChange={onSectionChange}
          onTabChange={setTab}
        />
        <PatientCoverageTab patientId={patientId} />
      </View>
    )
  }

  if (tab === 'wallet') {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.colorBgLayout }}>
        <PatientHeader
          title={patientName}
          section={section}
          tab={tab}
          onSectionChange={onSectionChange}
          onTabChange={setTab}
        />
        <PatientWalletTab patientId={patientId} />
      </View>
    )
  }

  if (tab === 'exams') {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.colorBgLayout }}>
        <PatientHeader
          title={patientName}
          section={section}
          tab={tab}
          onSectionChange={onSectionChange}
          onTabChange={setTab}
        />
        <PatientExamsTab patientId={patientId} />
      </View>
    )
  }

  if (tab === 'integrations') {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.colorBgLayout }}>
        <PatientHeader
          title={patientName}
          section={section}
          tab={tab}
          onSectionChange={onSectionChange}
          onTabChange={setTab}
        />
        <View style={styles.integrationsBody}>
          <PatientIntegrationsPanel patientId={patientId} />
        </View>
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.colorBgLayout }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.patientTitle, { color: tokens.colorTextBase }]}>{patientName}</Text>
      <PatientNavPicker
        section={section}
        tab={tab}
        onSectionChange={onSectionChange}
        onTabChange={setTab}
      />

      <PlaceholderTab
        title={content.title}
        subtitle={content.subtitle}
        note="Navegação alinhada a packages/web/src/lib/patient-navigation.ts"
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  header: { padding: 16, gap: 12, paddingBottom: 0 },
  integrationsBody: { flex: 1, paddingHorizontal: 16 },
  patientTitle: { fontSize: 20, fontWeight: '700' },
})
