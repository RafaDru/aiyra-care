import { useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
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
    case 'integrations':
      return {
        title: 'Integrações',
        subtitle: 'Portais conectados; sincronização completa continua no web (fase M6).',
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.colorBgLayout }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.patientId, { color: tokens.colorTextSecondary }]}>ID {id}</Text>
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
      <View style={[styles.avaHint, { borderColor: tokens.colorWarning }]}>
        <Text style={{ color: tokens.colorTextBase, fontWeight: '600' }}>Ava (placeholder)</Text>
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>
          FAB global como no web — fase M5 (AVA_OPERATIONAL G1).
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  patientId: { fontSize: 12 },
  avaHint: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
})
