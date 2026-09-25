import { useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { PatientExamsTab } from '@/components/clinical/PatientExamsTab'
import { PatientIntegrationsPanel } from '@/components/integrations/PatientIntegrationsPanel'
import { PatientWalletTab } from '@/components/wallet/PatientWalletTab'
import { PatientNavPicker } from '@/components/PatientNavPicker'
import { PlaceholderTab } from '@/components/PlaceholderTab'
import {
  defaultTabForSection,
  resolvePatientNav,
  type PatientSection,
  type PatientTabKey,
} from '@/lib/patient-navigation'
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

export default function PatientDetailScreen() {
  const { id, section: sectionParam, tab: tabParam } = useLocalSearchParams<{
    id: string
    section?: string
    tab?: string
  }>()
  const patientId = typeof id === 'string' ? id : id?.[0] ?? ''
  const { tokens } = useAiyraTheme()
  const initial = useMemo(
    () => resolvePatientNav(sectionParam ?? null, tabParam ?? null),
    [sectionParam, tabParam],
  )
  const [section, setSection] = useState<PatientSection>(initial.section)
  const [tab, setTab] = useState<PatientTabKey>(initial.tab)

  const onSectionChange = (next: PatientSection) => {
    setSection(next)
    setTab(defaultTabForSection(next))
  }

  const content = tabContent(tab)

  if (tab === 'wallet' && patientId) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.colorBgLayout }}>
        <View style={styles.header}>
          <Text style={[styles.patientId, { color: tokens.colorTextSecondary }]}>ID {patientId}</Text>
          <PatientNavPicker
            section={section}
            tab={tab}
            onSectionChange={onSectionChange}
            onTabChange={setTab}
          />
        </View>
        <PatientWalletTab patientId={patientId} />
      </View>
    )
  }

  if (tab === 'exams' && patientId) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.colorBgLayout }}>
        <View style={styles.header}>
          <Text style={[styles.patientId, { color: tokens.colorTextSecondary }]}>ID {patientId}</Text>
          <PatientNavPicker
            section={section}
            tab={tab}
            onSectionChange={onSectionChange}
            onTabChange={setTab}
          />
        </View>
        <PatientExamsTab patientId={patientId} />
      </View>
    )
  }

  if (tab === 'integrations' && patientId) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.colorBgLayout }}>
        <View style={styles.header}>
          <Text style={[styles.patientId, { color: tokens.colorTextSecondary }]}>ID {patientId}</Text>
          <PatientNavPicker
            section={section}
            tab={tab}
            onSectionChange={onSectionChange}
            onTabChange={setTab}
          />
        </View>
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
      <Text style={[styles.patientId, { color: tokens.colorTextSecondary }]}>ID {patientId}</Text>
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
  patientId: { fontSize: 12 },
})
