import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { Patient } from '@/lib/api.types'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

interface Props {
  patients: Patient[]
  patientId: string
  routePatientId: string | null
  lensOverridesRoute?: boolean
  onSelect: (id: string) => void
}

export function AvaPatientLensPicker({
  patients,
  patientId,
  routePatientId,
  lensOverridesRoute,
  onSelect,
}: Props) {
  const { tokens } = useAiyraTheme()

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: tokens.colorTextSecondary }]}>
        Lente de paciente
        {lensOverridesRoute ? ' · diferente da tela atual' : ''}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {patients.map((p) => {
          const active = p.id === patientId
          const onRoute = p.id === routePatientId
          return (
            <Pressable
              key={p.id}
              onPress={() => onSelect(p.id)}
              style={[
                styles.chip,
                {
                  borderColor: active ? tokens.colorPrimary : tokens.colorBorder,
                  backgroundColor: active ? tokens.colorBgLayout : tokens.colorBgContainer,
                },
              ]}
            >
              <Text
                style={{
                  color: active ? tokens.colorPrimary : tokens.colorTextBase,
                  fontWeight: active ? '600' : '400',
                  fontSize: 13,
                }}
                numberOfLines={1}
              >
                {p.name}
                {onRoute && !active ? ' · tela' : ''}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  label: { fontSize: 12, marginBottom: 6 },
  row: { gap: 8, paddingRight: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: 180,
  },
})
