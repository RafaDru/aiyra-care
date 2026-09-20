import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import type { Patient } from '@/lib/api.types'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export default function HomeScreen() {
  const { account, needsProfile } = useAuth()
  const { tokens } = useAiyraTheme()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await api.patients.list()
      setPatients(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar pacientes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <View style={[styles.screen, { backgroundColor: tokens.colorBgLayout }]}>
      <Text style={[styles.greeting, { color: tokens.colorTextBase }]}>
        Olá{account?.displayName ? `, ${account.displayName}` : ''}
      </Text>
      {needsProfile ? (
        <Text style={{ color: tokens.colorWarning, marginBottom: 8 }}>
          Complete o onboarding no web antes de usar o app.
        </Text>
      ) : null}
      {loading ? (
        <ActivityIndicator color={tokens.colorPrimary} />
      ) : error ? (
        <Text style={{ color: tokens.colorError }}>{error}</Text>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          ListEmptyComponent={
            <Text style={{ color: tokens.colorTextSecondary }}>Nenhum perfil de saúde ainda.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/(app)/patient/${item.id}`)}
              style={[styles.card, { backgroundColor: tokens.colorBgContainer, borderColor: tokens.colorBorder }]}
            >
              <Text style={[styles.name, { color: tokens.colorTextBase }]}>{item.name}</Text>
              <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>{item.ageCategory}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  greeting: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14 },
  name: { fontSize: 17, fontWeight: '600' },
})
