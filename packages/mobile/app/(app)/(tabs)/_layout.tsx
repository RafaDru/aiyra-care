import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export default function TabLayout() {
  const { t } = useTranslation()
  const { tokens } = useAiyraTheme()
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tokens.colorPrimary,
        tabBarInactiveTintColor: tokens.colorTextSecondary,
        headerStyle: { backgroundColor: tokens.colorBgContainer },
        headerTintColor: tokens.colorPrimary,
        tabBarStyle: {
          backgroundColor: tokens.colorBgContainer,
          borderTopColor: tokens.colorBorder,
          height: 56,
          paddingBottom: 6,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.home'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings.title'),
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
