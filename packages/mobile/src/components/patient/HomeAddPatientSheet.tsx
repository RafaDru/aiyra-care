import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { MaskedField } from '@/components/form/MaskedField'
import { FormField } from '@/components/ui/FormField'
import { FormSheet } from '@/components/ui/FormSheet'
import { useToast } from '@/contexts/ToastContext'
import { api } from '@/lib/api'
import { digitsOnly, formatCpfInput, formatDateBrInput, parseDateBrToIso } from '@/lib/input-masks'
import { isMinorBirthDate } from '@/lib/patient-age'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = {
  visible: boolean
  onClose: () => void
  onCreated: () => void
}

export function HomeAddPatientSheet({ visible, onClose, onCreated }: Props) {
  const { t } = useTranslation()
  const toast = useToast()
  const { tokens } = useAiyraTheme()
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [birthDateBr, setBirthDateBr] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | null>(null)
  const [cpf, setCpf] = useState('')
  const [minorConsent, setMinorConsent] = useState(false)

  const reset = () => {
    setName('')
    setBirthDateBr('')
    setGender(null)
    setCpf('')
    setMinorConsent(false)
  }

  const close = () => {
    reset()
    onClose()
  }

  const save = async () => {
    if (!name.trim()) {
      toast.info(t('onboarding.nameRequired'))
      return
    }
    const birthIso = parseDateBrToIso(birthDateBr)
    if (!birthIso) {
      toast.info(t('onboarding.birthDateRequired'))
      return
    }
    const cpfDigits = digitsOnly(cpf)
    if (cpf.trim() && cpfDigits.length !== 11) {
      toast.info(t('onboarding.cpfInvalid'))
      return
    }
    if (isMinorBirthDate(birthIso) && !minorConsent) {
      toast.info(t('onboarding.minorConsentRequired'))
      return
    }
    setSaving(true)
    try {
      if (isMinorBirthDate(birthIso)) {
        await api.compliance.accept({ kinds: ['minor_guardian_consent'] })
      }
      await api.patients.create({
        name: name.trim(),
        birthDate: birthIso,
        gender: gender ?? undefined,
        cpf: cpfDigits.length === 11 ? cpfDigits : undefined,
      })
      toast.success(t('patient.home.created'))
      close()
      onCreated()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('onboarding.dependentError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormSheet visible={visible} title={t('patient.home.addTitle')} onClose={close} onSave={() => void save()} saving={saving}>
      <FormField tokens={tokens} label={`${t('onboarding.name')} *`} value={name} onChangeText={setName} />
      <View>
        <Text style={{ color: tokens.colorTextBase, fontWeight: '600', fontSize: 14, marginBottom: 6 }}>
          {t('onboarding.birthDate')} *
        </Text>
        <MaskedField
          tokens={tokens}
          value={birthDateBr}
          onChangeText={setBirthDateBr}
          format={formatDateBrInput}
          placeholder="DD/MM/AAAA"
          keyboardType="number-pad"
        />
      </View>
      <View style={styles.chipRow}>
        {(['female', 'male'] as const).map((g) => {
          const active = gender === g
          return (
            <Pressable
              key={g}
              onPress={() => setGender(g)}
              style={[
                styles.chip,
                {
                  borderColor: active ? tokens.colorPrimary : tokens.colorBorder,
                  backgroundColor: active ? tokens.colorBgLayout : tokens.colorBgContainer,
                },
              ]}
            >
              <Text style={{ color: active ? tokens.colorPrimary : tokens.colorTextBase }}>
                {g === 'female' ? t('onboarding.genderFemale') : t('onboarding.genderMale')}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <FormField
        tokens={tokens}
        label={`${t('onboarding.cpf')} (${t('onboarding.optional')})`}
        value={cpf}
        onChangeText={(v) => setCpf(formatCpfInput(v))}
        keyboardType="number-pad"
      />
      {birthDateBr.length >= 10 && parseDateBrToIso(birthDateBr) && isMinorBirthDate(parseDateBrToIso(birthDateBr)!) ? (
        <Pressable onPress={() => setMinorConsent((v) => !v)} style={styles.consentRow}>
          <Text style={{ color: tokens.colorTextSecondary, flex: 1 }}>{t('onboarding.minorConsent')}</Text>
          <Text style={{ color: minorConsent ? tokens.colorPrimary : tokens.colorTextSecondary }}>{minorConsent ? '☑' : '☐'}</Text>
        </Pressable>
      ) : null}
    </FormSheet>
  )
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4 },
})
