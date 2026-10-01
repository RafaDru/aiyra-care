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
import { api } from '@/lib/api'
import type { AvaActivityEvent, AvaChatResponse, LlmUsageQuota } from '@/lib/api.types'
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
  initialMessage?: string
  entityPin?: AvaEntityPin
  autoSend?: boolean
}

export function AvaChatPanel({ patientId, initialMessage, entityPin, autoSend }: Props) {
  const { tokens } = useAiyraTheme()
  const [quota, setQuota] = useState<LlmUsageQuota | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activityTrace, setActivityTrace] = useState<AvaActivityEvent[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const listRef = useRef<FlatList<ChatMessage>>(null)
  const initialSentRef = useRef(false)

  const loadQuota = useCallback(() => {
    api.llm.quota().then(setQuota).catch(() => setQuota(null))
  }, [])

  useEffect(() => {
    loadQuota()
  }, [loadQuota, patientId])

  useEffect(() => {
    api.ava
      .listConversations(patientId)
      .then((r) => {
        const latest = r.items[0]
        if (latest) setConversationId(latest.id)
      })
      .catch(() => {})
  }, [patientId])

  const send = useCallback(
    async (overrideText?: string, pinForTurn?: AvaEntityPin) => {
      const text = (overrideText ?? input).trim()
      if (!text || loading) return
      if (isLlmQuotaExhausted(quota)) {
        Alert.alert('Ava', 'Franquia de uso esgotada neste período.')
        return
      }

      if (!overrideText) setInput('')
      setMessages((prev) => [...prev, { role: 'user', text }])
      setMessages((prev) => [...prev, { role: 'assistant', text: '', streaming: true }])
      setLoading(true)
      setActivityTrace([])

      try {
        const res: AvaChatResponse = await api.ava.chatWithActivity(
          patientId,
          {
            message: text,
            conversationId: conversationId ?? undefined,
            entityPin: pinForTurn ?? entityPin,
            allowLlmDataSharing: true,
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
        if (res.conversationId) setConversationId(res.conversationId)
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
      } catch (e) {
        setMessages((prev) => {
          const idx = prev.findIndex((m, i) => i === prev.length - 1 && m.role === 'assistant' && m.streaming)
          if (idx >= 0) return prev.slice(0, idx)
          return prev
        })
        const errMsg = e instanceof Error ? e.message : String(e)
        Alert.alert('Ava', errMsg)
        if (errMsg.includes('402') || errMsg.includes('Franquia') || errMsg.includes('LLM_QUOTA')) {
          loadQuota()
        }
      } finally {
        setLoading(false)
      }
    },
    [conversationId, entityPin, input, loading, loadQuota, patientId, quota],
  )

  useEffect(() => {
    if (!initialMessage?.trim() || initialSentRef.current) return
    initialSentRef.current = true
    setInput(initialMessage)
    if (autoSend) {
      void send(initialMessage, entityPin)
    }
  }, [autoSend, entityPin, initialMessage, send])

  useEffect(() => {
    if (messages.length === 0) return
    listRef.current?.scrollToEnd({ animated: true })
  }, [messages, activityTrace])

  const quotaLabel =
    quota && !quota.quotaBypassed
      ? `${Math.round(quota.usagePercent)}% do período · ${quota.totalTokensRemaining} tokens restantes`
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

      {activityTrace.length > 0 && loading ? (
        <View style={[styles.activity, { backgroundColor: tokens.colorBgLayout }]}>
          <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>
            {activityTrace[activityTrace.length - 1]?.label ?? 'Pensando…'}
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
                ? { alignSelf: 'flex-end', backgroundColor: tokens.colorBgLayout, borderColor: tokens.colorPrimary, borderWidth: 1 }
                : { alignSelf: 'flex-start', backgroundColor: tokens.colorBgContainer, borderColor: tokens.colorBorder, borderWidth: 1 },
            ]}
          >
            <Text style={{ color: tokens.colorTextBase }}>
              {item.text || (item.streaming ? '…' : '')}
              {item.revised ? '\n\n(resposta revisada pela Ava)' : ''}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: tokens.colorTextSecondary, textAlign: 'center', marginTop: 24 }}>
            Pergunte sobre o prontuário, integrações ou próximos passos. Ações com efeito no portal continuam no app web.
          </Text>
        }
      />

      <View style={[styles.composer, { borderTopColor: tokens.colorBorder }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Mensagem para a Ava…"
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
            <Text style={styles.sendLabel}>Enviar</Text>
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
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
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
