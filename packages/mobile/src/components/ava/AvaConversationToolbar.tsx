import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import type { AvaConversation } from '@/lib/api.types'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = {
  patientId: string
  conversationId: string | null
  onConversationIdChange: (id: string | null) => void
  onConversationsChanged?: () => void
}

function formatWhen(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short' })
}

export function AvaConversationToolbar({
  patientId,
  conversationId,
  onConversationIdChange,
  onConversationsChanged,
}: Props) {
  const { t, i18n } = useTranslation()
  const { tokens } = useAiyraTheme()
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR'
  const [items, setItems] = useState<AvaConversation[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  const reload = useCallback(() => {
    api.ava
      .listConversations(patientId)
      .then((r) => setItems(r.items.filter((c) => c.status === 'active')))
      .catch(() => setItems([]))
  }, [patientId])

  useEffect(() => {
    reload()
  }, [reload, conversationId])

  const startNew = () => {
    onConversationIdChange(null)
    onConversationsChanged?.()
    setPickerOpen(false)
  }

  const archive = () => {
    if (!conversationId) return
    Alert.alert(t('ava.archiveConversation'), t('ava.archiveConversationConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('ava.archiveConversation'),
        onPress: () => {
          void api.ava.archiveConversation(conversationId).then(() => {
            onConversationIdChange(null)
            reload()
            onConversationsChanged?.()
          })
        },
      },
    ])
  }

  const deleteConv = () => {
    if (!conversationId) return
    Alert.alert(t('ava.deleteConversationTitle'), t('ava.deleteConversationBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          void api.ava.deleteConversation(conversationId).then(() => {
            onConversationIdChange(null)
            reload()
            onConversationsChanged?.()
          })
        },
      },
    ])
  }

  const activeTitle =
    items.find((c) => c.id === conversationId)?.title?.trim() ||
    (conversationId ? t('ava.currentConversation') : t('ava.newConversation'))

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => setPickerOpen(true)}
        style={[styles.chip, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
      >
        <Text style={{ color: tokens.colorTextBase, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
          {activeTitle}
        </Text>
      </Pressable>
      <Pressable onPress={startNew} style={[styles.action, { borderColor: tokens.colorPrimary }]}>
        <Text style={{ color: tokens.colorPrimary, fontSize: 12, fontWeight: '600' }}>{t('ava.newConversation')}</Text>
      </Pressable>
      {conversationId ? (
        <>
          <Pressable onPress={archive} style={styles.actionGhost}>
            <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>{t('ava.archiveConversation')}</Text>
          </Pressable>
          <Pressable onPress={deleteConv} style={styles.actionGhost}>
            <Text style={{ color: tokens.colorError, fontSize: 12 }}>{t('common.delete')}</Text>
          </Pressable>
        </>
      ) : null}

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <View style={[styles.modalSheet, { backgroundColor: tokens.colorBgContainer }]}>
            <Text style={[styles.modalTitle, { color: tokens.colorTextBase }]}>{t('ava.pickConversation')}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {items.length === 0 ? (
                <Text style={{ color: tokens.colorTextSecondary, padding: 12 }}>{t('ava.noConversations')}</Text>
              ) : (
                items.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      onConversationIdChange(c.id)
                      setPickerOpen(false)
                    }}
                    style={[styles.listRow, { borderColor: tokens.colorBorder }]}
                  >
                    <Text style={{ color: tokens.colorTextBase, fontWeight: '600' }} numberOfLines={1}>
                      {c.title?.trim() || t('ava.untitledConversation')}
                    </Text>
                    <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>
                      {formatWhen(c.lastActivityAt, locale)}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
            <Pressable onPress={() => setPickerOpen(false)} style={{ padding: 14, alignItems: 'center' }}>
              <Text style={{ color: tokens.colorPrimary, fontWeight: '600' }}>{t('common.close')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 },
  chip: { flex: 1, minWidth: 120, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  action: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  actionGhost: { paddingHorizontal: 6, paddingVertical: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  listRow: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 12, gap: 2 },
})
