import type { ReactNode } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = {
  visible: boolean
  title: string
  onClose: () => void
  onSave: () => void
  saveLabel?: string
  saving?: boolean
  children: ReactNode
}

export function FormSheet({
  visible,
  title,
  onClose,
  onSave,
  saveLabel = 'Salvar',
  saving,
  children,
}: Props) {
  const { tokens } = useAiyraTheme()

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: tokens.colorBgLayout }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { borderBottomColor: tokens.colorBorder }]}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={{ color: tokens.colorTextSecondary, fontSize: 16 }}>Cancelar</Text>
          </Pressable>
          <Text style={[styles.title, { color: tokens.colorTextBase }]} numberOfLines={1}>
            {title}
          </Text>
          <Pressable onPress={onSave} disabled={saving} hitSlop={8}>
            <Text style={{ color: saving ? tokens.colorTextSecondary : tokens.colorPrimary, fontWeight: '700' }}>
              {saveLabel}
            </Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 17, fontWeight: '600', flex: 1, textAlign: 'center', marginHorizontal: 8 },
  body: { padding: 16, gap: 14, paddingBottom: 40 },
})
