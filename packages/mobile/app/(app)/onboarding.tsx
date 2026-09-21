import { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Redirect, router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { api } from '@/lib/api'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

function parseBirthDateInput(raw: string): Date | null {
  const trimmed = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T12:00:00`)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const m = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12)
  return Number.isNaN(d.getTime()) ? null : d
}

function isAdult(birthDate: Date): boolean {
  const age = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  return age >= 18
}

export default function OnboardingScreen() {
  const { t } = useTranslation()
  const toast = useToast()
  const { tokens } = useAiyraTheme()
  const { configured, loading, needsProfile, refreshSync } = useAuth()
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | null>(null)
  const [cpf, setCpf] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!configured) return <Redirect href="/(auth)/welcome" />
  if (!loading && !needsProfile) return <Redirect href="/(app)/(tabs)" />

  async function onSubmit() {
    if (!name.trim()) {
      toast.error(t('onboarding.nameRequired'))
      return
    }
    const parsed = parseBirthDateInput(birthDate)
    if (!parsed) {
      toast.error(t('onboarding.birthDateRequired'))
      return
    }
    if (!isAdult(parsed)) {
      toast.error(t('onboarding.adultOnly'))
      return
    }
    if (!gender) {
      toast.error(t('onboarding.genderRequired'))
      return
    }
    const cpfDigits = cpf.replace(/\D/g, '')
    if (cpfDigits.length !== 11) {
      toast.error(t('onboarding.cpfInvalid'))
      return
    }
    setSubmitting(true)
    try {
      await api.auth.completeProfile({
        name: name.trim(),
        birthDate: parsed.toISOString(),
        gender,
        cpf: cpfDigits,
      })
      await refreshSync()
      toast.success(t('onboarding.doneToast'), { durationMs: 5000, position: 'bottom' })
      router.replace('/(app)/(tabs)')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('onboarding.error'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.colorBgLayout }]}>
        <ActivityIndicator color={tokens.colorPrimary} />
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.colorBgLayout }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: tokens.colorTextBase }]}>{t('onboarding.welcomeTitle')}</Text>
      <Text style={[styles.subtitle, { color: tokens.colorTextSecondary }]}>{t('onboarding.welcomeSubtitle')}</Text>

      <TextInput
        placeholder={t('onboarding.name')}
        placeholderTextColor={tokens.colorTextSecondary}
        value={name}
        onChangeText={setName}
        style={[styles.input, { borderColor: tokens.colorBorder, color: tokens.colorTextBase }]}
      />
      <TextInput
        placeholder={`${t('onboarding.birthDate')} (DD/MM/AAAA)`}
        placeholderTextColor={tokens.colorTextSecondary}
        value={birthDate}
        onChangeText={setBirthDate}
        keyboardType="numbers-and-punctuation"
        style={[styles.input, { borderColor: tokens.colorBorder, color: tokens.colorTextBase }]}
      />
      <View style={styles.genderRow}>
        {(['female', 'male'] as const).map((g) => (
          <Pressable
            key={g}
            onPress={() => setGender(g)}
            style={[
              styles.genderBtn,
              {
                borderColor: tokens.colorBorder,
                backgroundColor: gender === g ? tokens.colorPrimary : tokens.colorBgContainer,
              },
            ]}
          >
            <Text style={{ color: gender === g ? '#fff' : tokens.colorTextBase, fontWeight: '600' }}>
              {g === 'female' ? t('onboarding.genderFemale') : t('onboarding.genderMale')}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        placeholder={t('onboarding.cpf')}
        placeholderTextColor={tokens.colorTextSecondary}
        value={cpf}
        onChangeText={setCpf}
        keyboardType="number-pad"
        style={[styles.input, { borderColor: tokens.colorBorder, color: tokens.colorTextBase }]}
      />

      <Pressable
        onPress={() => void onSubmit()}
        disabled={submitting}
        style={[styles.primary, { backgroundColor: tokens.colorPrimary, opacity: submitting ? 0.7 : 1 }]}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText}>{t('onboarding.continue')}</Text>
        )}
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, gap: 12, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primary: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
