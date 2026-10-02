import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { Redirect, router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { MaskedField } from '@/components/form/MaskedField'
import { NoticeBanner } from '@/components/ui/NoticeBanner'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { api } from '@/lib/api'
import {
  digitsOnly,
  formatCpfInput,
  formatDateBrInput,
  parseDateBrToIso,
} from '@/lib/input-masks'
import { clearOnboardingWizard, getOnboardingWizardStep, setOnboardingWizardStep } from '@/lib/onboarding-wizard'
import { isMinorBirthDate } from '@/lib/patient-age'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

function isAdultIso(iso: string): boolean {
  const birth = new Date(iso)
  const age = (Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  return age >= 18
}

type DependentDraft = { id: string; name: string }

export default function OnboardingScreen() {
  const { t } = useTranslation()
  const toast = useToast()
  const { tokens } = useAiyraTheme()
  const { configured, loading, needsProfile, refreshSync } = useAuth()
  const [step, setStep] = useState<0 | 1>(0)
  const [stepReady, setStepReady] = useState(false)

  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | null>(null)
  const [cpf, setCpf] = useState('')

  const [depName, setDepName] = useState('')
  const [depBirthDate, setDepBirthDate] = useState('')
  const [depGender, setDepGender] = useState<'male' | 'female' | null>(null)
  const [depCpf, setDepCpf] = useState('')
  const [depWeight, setDepWeight] = useState('')
  const [depHeight, setDepHeight] = useState('')
  const [minorConsent, setMinorConsent] = useState(false)
  const [dependents, setDependents] = useState<DependentDraft[]>([])

  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void getOnboardingWizardStep().then((s) => {
      setStep(s)
      setStepReady(true)
    })
  }, [])

  const depBirthIso = parseDateBrToIso(depBirthDate)
  const showMinorConsent = depBirthIso ? isMinorBirthDate(depBirthIso) : false

  if (!configured) return <Redirect href="/(auth)/welcome" />
  if (stepReady && !loading && !needsProfile && step === 0) {
    return <Redirect href="/(app)/(tabs)" />
  }

  async function onProfileSubmit() {
    if (!name.trim()) {
      toast.error(t('onboarding.nameRequired'))
      return
    }
    const birthIso = parseDateBrToIso(birthDate)
    if (!birthIso) {
      toast.error(t('onboarding.birthDateRequired'))
      return
    }
    if (!isAdultIso(birthIso)) {
      toast.error(t('onboarding.adultOnly'))
      return
    }
    if (!gender) {
      toast.error(t('onboarding.genderRequired'))
      return
    }
    const cpfDigits = digitsOnly(cpf)
    if (cpfDigits.length !== 11) {
      toast.error(t('onboarding.cpfInvalid'))
      return
    }
    setSubmitting(true)
    try {
      await api.auth.completeProfile({
        name: name.trim(),
        birthDate: birthIso,
        gender,
        cpf: cpfDigits,
      })
      await refreshSync()
      await setOnboardingWizardStep(1)
      setStep(1)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('onboarding.error'))
    } finally {
      setSubmitting(false)
    }
  }

  async function finishOnboarding() {
    await clearOnboardingWizard()
    setStep(0)
    router.replace('/(app)/(tabs)')
  }

  async function onAddDependent() {
    if (!depName.trim()) {
      toast.error(t('onboarding.nameRequired'))
      return
    }
    const birthIso = parseDateBrToIso(depBirthDate)
    if (!birthIso) {
      toast.error(t('onboarding.birthDateRequired'))
      return
    }
    const cpfDigits = digitsOnly(depCpf)
    if (depCpf.trim() && cpfDigits.length !== 11) {
      toast.error(t('onboarding.cpfInvalid'))
      return
    }
    if (isMinorBirthDate(birthIso) && !minorConsent) {
      toast.error(t('onboarding.minorConsentRequired'))
      return
    }
    setSubmitting(true)
    try {
      if (isMinorBirthDate(birthIso)) {
        await api.compliance.accept({ kinds: ['minor_guardian_consent'] })
      }
      const created = await api.patients.create({
        name: depName.trim(),
        birthDate: birthIso,
        gender: depGender ?? undefined,
        cpf: cpfDigits.length === 11 ? cpfDigits : undefined,
        weightKg: depWeight.trim() ? Number(depWeight) : undefined,
        heightCm: depHeight.trim() ? Number(depHeight) : undefined,
      })
      setDependents((prev) => [...prev, { id: created.id, name: created.name }])
      setDepName('')
      setDepBirthDate('')
      setDepGender(null)
      setDepCpf('')
      setDepWeight('')
      setDepHeight('')
      setMinorConsent(false)
      toast.success(t('onboarding.dependentAddedToast'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('onboarding.dependentError'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !stepReady) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.colorBgLayout }]}>
        <ActivityIndicator color={tokens.colorPrimary} />
      </View>
    )
  }

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: tokens.colorBgLayout }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid
      extraScrollHeight={24}
    >
      <View style={styles.stepsRow}>
        <Text style={[styles.stepLabel, { color: step === 0 ? tokens.colorPrimary : tokens.colorTextSecondary }]}>
          1 · {t('onboarding.steps.profile')}
        </Text>
        <Text style={[styles.stepLabel, { color: step === 1 ? tokens.colorPrimary : tokens.colorTextSecondary }]}>
          2 · {t('onboarding.steps.dependents')}
        </Text>
      </View>

      {step === 0 ? (
        <>
          <Text style={[styles.title, { color: tokens.colorTextBase }]}>{t('onboarding.welcomeTitle')}</Text>
          <Text style={[styles.subtitle, { color: tokens.colorTextSecondary }]}>{t('onboarding.welcomeSubtitle')}</Text>

          <TextInput
            placeholder={t('onboarding.name')}
            placeholderTextColor={tokens.colorTextSecondary}
            value={name}
            onChangeText={setName}
            autoComplete="name"
            style={[styles.input, { borderColor: tokens.colorBorder, color: tokens.colorTextBase }]}
          />
          <MaskedField
            tokens={tokens}
            placeholder={`${t('onboarding.birthDate')} (DD/MM/AAAA)`}
            value={birthDate}
            onChangeText={setBirthDate}
            format={formatDateBrInput}
            keyboardType="number-pad"
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
          <MaskedField
            tokens={tokens}
            placeholder={t('onboarding.cpf')}
            value={cpf}
            onChangeText={setCpf}
            format={formatCpfInput}
            keyboardType="number-pad"
          />

          <Pressable
            onPress={() => void onProfileSubmit()}
            disabled={submitting}
            style={[styles.primary, { backgroundColor: tokens.colorPrimary, opacity: submitting ? 0.7 : 1 }]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>{t('onboarding.continue')}</Text>
            )}
          </Pressable>
        </>
      ) : (
        <>
          <Text style={[styles.title, { color: tokens.colorTextBase }]}>{t('onboarding.dependentsTitle')}</Text>
          <Text style={[styles.subtitle, { color: tokens.colorTextSecondary }]}>{t('onboarding.dependentsSubtitle')}</Text>

          {dependents.length > 0 ? (
            <NoticeBanner tokens={tokens} tone="success">
              {t('onboarding.dependentsAdded', { count: dependents.length })}
              {'\n'}
              {dependents.map((d) => d.name).join(', ')}
            </NoticeBanner>
          ) : null}

          <TextInput
            placeholder={t('onboarding.dependentName')}
            placeholderTextColor={tokens.colorTextSecondary}
            value={depName}
            onChangeText={setDepName}
            style={[styles.input, { borderColor: tokens.colorBorder, color: tokens.colorTextBase }]}
          />
          <MaskedField
            tokens={tokens}
            placeholder={`${t('onboarding.birthDate')} (DD/MM/AAAA)`}
            value={depBirthDate}
            onChangeText={setDepBirthDate}
            format={formatDateBrInput}
            keyboardType="number-pad"
          />
          <View style={styles.genderRow}>
            {(['female', 'male'] as const).map((g) => (
              <Pressable
                key={g}
                onPress={() => setDepGender(g)}
                style={[
                  styles.genderBtn,
                  {
                    borderColor: tokens.colorBorder,
                    backgroundColor: depGender === g ? tokens.colorPrimary : tokens.colorBgContainer,
                  },
                ]}
              >
                <Text style={{ color: depGender === g ? '#fff' : tokens.colorTextBase, fontWeight: '600' }}>
                  {g === 'female' ? t('onboarding.genderFemale') : t('onboarding.genderMale')}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            placeholder={t('onboarding.weightOptional')}
            placeholderTextColor={tokens.colorTextSecondary}
            value={depWeight}
            onChangeText={setDepWeight}
            keyboardType="decimal-pad"
            style={[styles.input, { borderColor: tokens.colorBorder, color: tokens.colorTextBase }]}
          />
          <TextInput
            placeholder={t('onboarding.heightOptional')}
            placeholderTextColor={tokens.colorTextSecondary}
            value={depHeight}
            onChangeText={setDepHeight}
            keyboardType="decimal-pad"
            style={[styles.input, { borderColor: tokens.colorBorder, color: tokens.colorTextBase }]}
          />
          <MaskedField
            tokens={tokens}
            placeholder={`${t('onboarding.cpf')} (${t('onboarding.optional')})`}
            value={depCpf}
            onChangeText={setDepCpf}
            format={formatCpfInput}
            keyboardType="number-pad"
          />

          {showMinorConsent ? (
            <Pressable onPress={() => setMinorConsent((v) => !v)} style={styles.legalRow}>
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: tokens.colorBorder,
                    backgroundColor: minorConsent ? tokens.colorPrimary : tokens.colorBgContainer,
                  },
                ]}
              >
                {minorConsent ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <Text style={[styles.legalText, { color: tokens.colorTextSecondary }]}>{t('onboarding.minorConsent')}</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => void onAddDependent()}
            disabled={submitting}
            style={[styles.secondary, { borderColor: tokens.colorBorder, opacity: submitting ? 0.7 : 1 }]}
          >
            {submitting ? (
              <ActivityIndicator color={tokens.colorPrimary} />
            ) : (
              <Text style={[styles.secondaryText, { color: tokens.colorTextBase }]}>{t('onboarding.addDependent')}</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => void finishOnboarding()}
            disabled={dependents.length === 0}
            style={[
              styles.primary,
              {
                backgroundColor: tokens.colorPrimary,
                opacity: dependents.length === 0 ? 0.45 : 1,
              },
            ]}
          >
            <Text style={styles.primaryText}>{t('onboarding.finish')}</Text>
          </Pressable>
          <Pressable onPress={() => void finishOnboarding()}>
            <Text style={[styles.link, { color: tokens.colorPrimary }]}>{t('onboarding.skipDependents')}</Text>
          </Pressable>
        </>
      )}
    </KeyboardAwareScrollView>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, gap: 12, paddingBottom: 40 },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  stepLabel: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primary: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondary: { borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  secondaryText: { fontWeight: '600', fontSize: 16 },
  link: { textAlign: 'center', fontWeight: '600', marginTop: 8 },
  legalRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  legalText: { flex: 1, fontSize: 13, lineHeight: 18 },
})
