import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  PATIENT_SECTIONS,
  SECTION_LABELS,
  SECTION_TABS,
  TAB_LABELS,
  type PatientSection,
  type PatientTabKey,
} from '@/lib/patient-navigation'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = {
  section: PatientSection
  tab: PatientTabKey
  onSectionChange: (section: PatientSection) => void
  onTabChange: (tab: PatientTabKey) => void
}

export function PatientNavPicker({ section, tab, onSectionChange, onTabChange }: Props) {
  const { tokens } = useAiyraTheme()
  const tabs = SECTION_TABS[section]

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {PATIENT_SECTIONS.map((s) => {
          const active = s === section
          return (
            <Pressable
              key={s}
              onPress={() => onSectionChange(s)}
              style={[
                styles.chip,
                {
                  borderColor: active ? tokens.colorPrimary : tokens.colorBorder,
                  backgroundColor: active ? `${tokens.colorPrimary}22` : tokens.colorBgContainer,
                },
              ]}
            >
              <Text style={{ color: active ? tokens.colorPrimary : tokens.colorTextSecondary, fontWeight: '600' }}>
                {SECTION_LABELS[s]}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {tabs.map((t) => {
          const active = t === tab
          return (
            <Pressable
              key={t}
              onPress={() => onTabChange(t)}
              style={[
                styles.tabChip,
                {
                  borderColor: active ? tokens.colorInfo : tokens.colorBorder,
                  backgroundColor: active ? `${tokens.colorInfo}18` : 'transparent',
                },
              ]}
            >
              <Text style={{ color: active ? tokens.colorInfo : tokens.colorTextBase, fontSize: 13 }}>
                {TAB_LABELS[t]}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
})
