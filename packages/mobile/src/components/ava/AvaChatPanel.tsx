import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { AvaMarkdown } from '@/components/ava/AvaMarkdown'
import { AvaSessionPinsBar } from '@/components/ava/AvaSessionPinsBar'
import { api } from '@/lib/api'
import type { AvaActivityEvent, AvaChatResponse, AvaSessionPin, LlmUsageQuota } from '@/lib/api.types'
import type { AvaEntityPin } from '@/lib/ava-entity-pin'
import { isLlmQuotaExhausted } from '@/lib/llm-quota'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  revised?: boolean
  streaming?: boolean
}

interface Props {
  patientId: string
  conversationId: string | null
  onConversationIdChange: (id: string | null) => void
  initialMessage?: string
  entityPin?: AvaEntityPin
  autoSend?: boolean
  onAcceleratorConsumed?: () => void
}

export function AvaChatPanel({
  patientId,
  conversationId,
  onConversationIdChange,
  initialMessage,
  entityPin,
  autoSend,
  onAcceleratorConsumed,
}: Props) {
  const { t } = useTranslation()
  const { tokens } = useAiyraTheme()
  const [quota, setQuota] = useState<LlmUsageQuota | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activityTrace, setActivityTrace] = useState<AvaActivityEvent[]>([])
  const [contextPins, setContextPins] = useState<AvaSessionPin[]>([])
  const [attachment, setAttachment] = useState<{ documentId: string; filename: string } | null>(null)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const listRef = useRef<FlatList<ChatMessage>>(null)
  const initialSentRef = useRef(false)
  const conversationIdRef = useRef(conversationId)
  conversationIdRef.current = conversationId

  const loadQuota = useCallback(() => {
    api.llm.quota().then(setQuota).catch(() => setQuota(null))
  }, [])

  useEffect(() => {
    loadQuota()
  }, [loadQuota, patientId])

  const loadContextPins = useCallback(() => {
    if (!conversationId) {
      setContextPins([])
      return
    }
    api.ava
      .getContext(conversationId)
      .then((r) => setContextPins(r.pins))
      .catch(() => setContextPins([]))
  }, [conversationId])

  useEffect(() => {
    loadContextPins()
  }, [loadContextPins])

  const loadMessages = useCallback((id: string) => {
    api.ava
      .getMessages(id)
      .then((r) => {
        if (conversationIdRef.current !== id) return
        setMessages(
          r.messages.map((m) => ({
            role: m.role,
            text: m.content,
            revised: Boolean(
              m.metadata?.reflection && (m.metadata.reflection as { revised?: boolean }).revised,
            ),
          })),
        )
      })
      .catch(() => {
        if (conversationIdRef.current !== id) return
        setMessages([])
      })
  }, [])

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      return
    }
    loadMessages(conversationId)
  }, [conversationId, loadMessages])

  const send = useCallback(
    async (overrideText?: string, pinForTurn?: AvaEntityPin) => {
      const text = (overrideText ?? input).trim()
      if (!text || loading) return
      if (isLlmQuotaExhausted(quota)) {
        Alert.alert(t('ava.title'), t('ava.quotaExhausted'))
        return
      }

      if (!overrideText) setInput('')
      setMessages((prev) => [...prev, { role: 'user', text }])
      setMessages((prev) => [...prev, { role: 'assistant', text: '', streaming: true }])
      setLoading(true)
      setActivityTrace([])

      const attachmentDocumentId = attachment?.documentId
      if (attachment) setAttachment(null)

      try {
        const res: AvaChatResponse = await api.ava.chatWithActivity(
          patientId,
          {
            message: text,
            conversationId: conversationId ?? undefined,
            entityPin: pinForTurn ?? entityPin,
            allowLlmDataSharing: true,
            attachmentDocumentId,
          },
          (event) => setActivityTrace((prev) => [...prev, event]),
          (delta) => {
            setMessages((prev) => {
              const next = [...prev]
              const idx = next.findIndex((m, i) => i === next.length - 1 && m.role === 'assistant' && m.streaming)
              if (idx < 0) return prev
              next[idx] = { ...next[idx], text: next[idx].text + delta }
              return next
            })
          },
        )
        if (res.conversationId) onConversationIdChange(res.conversationId)
        setQuota(res.quota)
        if (res.activityTrace?.length) setActivityTrace(res.activityTrace)
        setMessages((prev) => {
          const next = [...prev]
          const idx = next.findIndex((m, i) => i === next.length - 1 && m.role === 'assistant' && m.streaming)
          const assistant: ChatMessage = {
            role: 'assistant',
            text: res.reply,
            revised: res.reflection.revised,
          }
          if (idx >= 0) {
            next[idx] = assistant
            return next
          }
          return [...next, assistant]
        })
        loadContextPins()
      } catch (e) {
        setMessages((prev) => {
          const idx = prev.findIndex((m, i) => i === prev.length - 1 && m.role === 'assistant' && m.streaming)
          if (idx >= 0) return prev.slice(0, idx)
          return prev
        })
        const errMsg = e instanceof Error ? e.message : String(e)
        Alert.alert(t('ava.title'), errMsg)
        if (errMsg.includes('402') || errMsg.includes('Franquia') || errMsg.includes('LLM_QUOTA')) {
          loadQuota()
        }
      } finally {
        setLoading(false)
      }
    },
    [
      attachment,
      conversationId,
      entityPin,
      input,
      loadContextPins,
      loadQuota,
      loading,
      onConversationIdChange,
      patientId,
      quota,
      t,
    ],
  )

  useEffect(() => {
    if (!initialMessage?.trim() || initialSentRef.current) return
    if (quota === null) return
    if (isLlmQuotaExhausted(quota)) return
    initialSentRef.current = true
    setInput(initialMessage)
    if (autoSend) {
      onAcceleratorConsumed?.()
      void send(initialMessage, entityPin)
    }
  }, [autoSend, entityPin, initialMessage, onAcceleratorConsumed, quota, send])

  useEffect(() => {
    if (messages.length === 0) return
    listRef.current?.scrollToEnd({ animated: true })
  }, [messages, activityTrace])

  const pickImage = async () => {
    const ImagePicker = await import('expo-image-picker')
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert(t('ava.title'), t('ava.imagePermissionDenied'))
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    setUploadingAttachment(true)
    try {
      const name = asset.fileName ?? `ava-attach-${Date.now()}.jpg`
      const doc = await api.documents.upload(patientId, 'exam', {
        uri: asset.uri,
        name,
        mimeType: asset.mimeType ?? 'image/jpeg',
      })
      setAttachment({ documentId: doc.id, filename: doc.originalFilename })
    } catch (e) {
      Alert.alert(t('ava.title'), e instanceof Error ? e.message : t('ava.imageAttachFailed'))
    } finally {
      setUploadingAttachment(false)
    }
  }

  const quotaLabel =
    quota && !quota.quotaBypassed
      ? `${Math.round(quota.usagePercent)}% · ${quota.totalTokensRemaining} tokens`
      : null

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      {quotaLabel ? (
        <Text style={[styles.quota, { color: tokens.colorTextSecondary }]}>{quotaLabel}</Text>
      ) : null}

      <AvaSessionPinsBar pins={contextPins} />

      {entityPin && !autoSend ? (
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 12, marginBottom: 6 }}>
          {t('ava.entityPinActive')}
        </Text>
      ) : null}

      {activityTrace.length > 0 && loading ? (
        <View style={[styles.activity, { backgroundColor: tokens.colorBgLayout }]}>
          <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>
            {activityTrace[activityTrace.length - 1]?.label ?? t('ava.thinking')}
          </Text>
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === 'user'
                ? {
                    alignSelf: 'flex-end',
                    backgroundColor: tokens.colorBgLayout,
                    borderColor: tokens.colorPrimary,
                    borderWidth: 1,
                  }
                : {
                    alignSelf: 'flex-start',
                    backgroundColor: tokens.colorBgContainer,
                    borderColor: tokens.colorBorder,
                    borderWidth: 1,
                  },
            ]}
          >
            {item.role === 'assistant' && item.text && !item.streaming ? (
              <AvaMarkdown content={item.text} />
            ) : (
              <Text style={{ color: tokens.colorTextBase }}>
                {item.text || (item.streaming ? '…' : '')}
              </Text>
            )}
            {item.revised ? (
              <Text style={{ color: tokens.colorTextSecondary, fontSize: 12, marginTop: 8 }}>
                {t('ava.revised')}
              </Text>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: tokens.colorTextSecondary, textAlign: 'center', marginTop: 24 }}>
            {t('ava.emptyHint')}
          </Text>
        }
      />

      {attachment ? (
        <View style={[styles.attachment, { borderColor: tokens.colorBorder }]}>
          <Text style={{ color: tokens.colorTextBase, flex: 1 }} numberOfLines={1}>
            {attachment.filename}
          </Text>
          <Pressable onPress={() => setAttachment(null)}>
            <Text style={{ color: tokens.colorError }}>{t('common.remove')}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.composer, { borderTopColor: tokens.colorBorder }]}>
        <Pressable
          onPress={() => void pickImage()}
          disabled={loading || uploadingAttachment}
          style={styles.attachBtn}
        >
          {uploadingAttachment ? (
            <ActivityIndicator size="small" color={tokens.colorPrimary} />
          ) : (
            <Text style={{ color: tokens.colorPrimary, fontWeight: '600' }}>+</Text>
          )}
        </Pressable>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t('ava.messagePlaceholder')}
          placeholderTextColor={tokens.colorTextSecondary}
          multiline
          style={[
            styles.input,
            {
              color: tokens.colorTextBase,
              borderColor: tokens.colorBorder,
              backgroundColor: tokens.colorBgContainer,
            },
          ]}
          editable={!loading}
        />
        <Pressable
          onPress={() => void send()}
          disabled={loading || !input.trim()}
          style={[
            styles.send,
            {
              backgroundColor: loading || !input.trim() ? tokens.colorBorder : tokens.colorPrimary,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendLabel}>{t('ava.send')}</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  quota: { fontSize: 11, paddingHorizontal: 4, paddingBottom: 4 },
  activity: { borderRadius: 8, padding: 8, marginBottom: 8 },
  list: { paddingVertical: 8, gap: 8, flexGrow: 1 },
  bubble: { maxWidth: '88%', borderRadius: 12, padding: 12, marginBottom: 8 },
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachBtn: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  send: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center' },
  sendLabel: { color: '#fff', fontWeight: '600' },
})
