import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { Patient } from '@/lib/api.types'
import {
  DASHBOARD_AGE_BAND_COLOR,
  DASHBOARD_AGE_BAND_I18N,
  patientAvatarColor,
} from '@/lib/dashboard-age-band'
import { formatPatientAge } from '@/lib/format-patient-age'
import type { AiyraThemeTokens } from '@/theme/useAiyraTheme'

type Props = {
  patient: Patient
  tokens: AiyraThemeTokens
  onPress: () => void
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: `${color}18`, borderColor: `${color}55` }]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  )
}

export function HomePatientCard({ patient, tokens, onPress }: Props) {
  const { t } = useTranslation()
  const age = formatPatientAge(patient.birthDate, t)
  const bandKey = DASHBOARD_AGE_BAND_I18N[patient.ageCategory]
  const bandColor = DASHBOARD_AGE_BAND_COLOR[patient.ageCategory]
  const initial = patient.name.trim().charAt(0).toUpperCase() || '?'
  const avatarBg = patientAvatarColor(patient.gender)

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: tokens.colorBgContainer,
          borderColor: tokens.colorBorder,
        },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
        <Text style={styles.avatarLetter}>{initial}</Text>
      </View>
      <Text style={[styles.name, { color: tokens.colorTextBase }]} numberOfLines={2}>
        {patient.name}
      </Text>
      <Text style={[styles.age, { color: tokens.colorTextSecondary }]}>{age}</Text>
      <View style={styles.tags}>
        {bandKey ? <Tag label={t(bandKey)} color={bandColor} /> : null}
        {patient.gender === 'male' ? <Tag label={t('patient.male')} color="#2563EB" /> : null}
        {patient.gender === 'female' ? <Tag label={t('patient.female')} color="#DB2777" /> : null}
        {patient.isSelf || patient.membershipRole === 'self' ? (
          <Tag label={t('patient.you')} color={tokens.colorPrimary} />
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 28, fontWeight: '700' },
  name: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  age: { fontSize: 14, marginBottom: 10 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  tag: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { fontSize: 11, fontWeight: '600' },
})
