import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

function TabIcon({ label }: { label: string }) {
  return <Text style={{ fontSize: 18 }}>{label}</Text>
}

export default function TabLayout() {
  const { tokens } = useAiyraTheme()
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tokens.colorPrimary,
        tabBarInactiveTintColor: tokens.colorTextSecondary,
        headerStyle: { backgroundColor: tokens.colorBgContainer },
        headerTintColor: tokens.colorPrimary,
        tabBarStyle: { backgroundColor: tokens.colorBgContainer, borderTopColor: tokens.colorBorder },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: () => <TabIcon label="🏠" />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Configurações',
          tabBarIcon: () => <TabIcon label="⚙️" />,
        }}
      />
    </Tabs>
  )
}
