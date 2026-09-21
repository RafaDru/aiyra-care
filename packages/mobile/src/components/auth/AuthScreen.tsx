import type { ReactNode } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export function AuthScreen({ children }: { children: ReactNode }) {
  const { tokens } = useAiyraTheme()

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: tokens.colorBgLayout }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.inner}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 48 },
  inner: { width: '100%', maxWidth: 440, alignSelf: 'center' },
})
