import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { Link, router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { AppLogo } from '@/components/brand/AppLogo'
import { useAuth } from '@/contexts/AuthContext'
import { setAppLanguage, type AppLanguage } from '@/i18n'
import { webAppBaseUrl } from '@/lib/web-app-url'
import type { AppearancePreference } from '@/theme/AppearancePreferenceContext'
import { useAppearancePreference } from '@/theme/AppearancePreferenceContext'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export default function SettingsScreen() {
  const { t, i18n } = useTranslation()
  const { account, signOut } = useAuth()
  const { tokens } = useAiyraTheme()
  const { preference, setPreference } = useAppearancePreference()

  const appearanceOptions: { key: AppearancePreference; label: string }[] = [
    { key: 'light', label: t('settings.appearanceLight') },
    { key: 'dark', label: t('settings.appearanceDark') },
    { key: 'system', label: t('settings.appearanceSystem') },
  ]

  const languageOptions: { key: AppLanguage; label: string }[] = [
    { key: 'pt-BR', label: t('settings.languagePt') },
    { key: 'en', label: t('settings.languageEn') },
  ]

  const webBase = webAppBaseUrl()
  const currentLang: AppLanguage = i18n.language === 'en' ? 'en' : 'pt-BR'

  return (
    <View style={[styles.screen, { backgroundColor: tokens.colorBgLayout }]}>
      <View style={styles.logoRow}>
        <AppLogo variant="horizontal" height={32} />
      </View>
      <Text style={[styles.title, { color: tokens.colorTextBase }]}>{t('settings.title')}</Text>
      <Text style={{ color: tokens.colorTextSecondary, marginBottom: 16 }}>{account?.email ?? '—'}</Text>

      <Text style={[styles.sectionLabel, { color: tokens.colorTextSecondary }]}>{t('settings.language')}</Text>
      <View style={[styles.segmentRow, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}>
        {languageOptions.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => void setAppLanguage(opt.key)}
            style={[styles.segment, currentLang === opt.key && { backgroundColor: tokens.colorBgLayout }]}
          >
            <Text
              style={{
                fontWeight: currentLang === opt.key ? '700' : '500',
                color: currentLang === opt.key ? tokens.colorPrimary : tokens.colorTextSecondary,
                fontSize: 13,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.sectionLabel, { color: tokens.colorTextSecondary }]}>{t('settings.appearance')}</Text>
      <View style={[styles.segmentRow, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}>
        {appearanceOptions.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => setPreference(opt.key)}
            style={[styles.segment, preference === opt.key && { backgroundColor: tokens.colorBgLayout }]}
          >
            <Text
              style={{
                fontWeight: preference === opt.key ? '700' : '500',
                color: preference === opt.key ? tokens.colorPrimary : tokens.colorTextSecondary,
                fontSize: 13,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Link href="/(app)/settings/family" asChild>
        <Pressable style={[styles.row, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}>
          <Text style={{ color: tokens.colorTextBase, fontWeight: '600' }}>{t('settings.family')}</Text>
          <Text style={{ color: tokens.colorTextSecondary }}>›</Text>
        </Pressable>
      </Link>

      {webBase ? (
        <Pressable
          onPress={() => void Linking.openURL(webBase)}
          style={[styles.row, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer, marginTop: 12 }]}
        >
          <View>
            <Text style={{ color: tokens.colorTextBase, fontWeight: '600' }}>{t('settings.openWeb')}</Text>
            <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>{t('settings.openWebHint')}</Text>
          </View>
          <Text style={{ color: tokens.colorTextSecondary }}>›</Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => signOut().then(() => router.replace('/(auth)/login'))}
        style={[styles.row, { borderColor: tokens.colorError, backgroundColor: tokens.colorBgContainer, marginTop: 24 }]}
      >
        <Text style={{ color: tokens.colorError, fontWeight: '600' }}>{t('settings.signOut')}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  logoRow: { alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  segmentRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  segment: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
})
