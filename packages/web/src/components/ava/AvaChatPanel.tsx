import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Avatar, Button, Checkbox, Input, Modal, Select, Typography, App } from 'antd'
import { FileTextOutlined, PictureOutlined, SendOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import type { AvaActivityEvent, AvaChatResponse, AvaConversation, LlmUsageQuota } from '../../lib/api.types.js'
import { useLlmActivity } from '../../contexts/LlmActivityContext.js'
import { useAuth } from '../../contexts/AuthContext.js'
import { DismissibleHint } from '../ui/DismissibleHint.js'
import { AvaAvatar } from './AvaAvatar.js'
import { AvaQuotaBar } from './AvaQuotaBar.js'
import { AvaChatHeading } from './AvaChatHeading.js'
import { useAvaThinkingPhrase } from './useAvaThinkingPhrase.js'
import { useAvaExpression } from './useAvaExpression.js'
import { caregiverFirstName } from '../../lib/ava-personalization.js'
import { AvaThinkingAura } from './AvaThinkingAura.js'
import {
  AVA_CHAT_STAGE_AVATAR_SIZE,
  AVA_CHAT_USER_STAGE_SIZE,
} from './ava-sizes.js'
import {
  readAvaAllowLlmDataSharing,
  readAvaImageAttachWarningDismissed,
  writeAvaAllowLlmDataSharing,
  writeAvaImageAttachWarningDismissed,
} from '../../lib/ava-llm-preferences.js'
import { isLlmQuotaExhausted } from '../../lib/llm-quota.js'
import type { AvaEntityPin } from '../../lib/ava-dock-bus.js'
import { AvaChatBubble } from './AvaChatBubble.js'
import { AvaReportModal } from './AvaReportModal.js'
import './ava-chat.css'
import './ava-report.css'

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  revised?: boolean
}

interface Props {
  patientId: string
  healthThreadId?: string
  variant?: 'card' | 'embedded'
  showTitle?: boolean
  initialMessage?: string
  entityPin?: AvaEntityPin
  autoSend?: boolean
  conversationId?: string | null
  onConversationIdChange?: (id: string | null) => void
  onAcceleratorConsumed?: () => void
}

interface PendingAttachment {
  documentId: string
  filename: string
}

function initialsOf(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export function AvaChatPanel({
  patientId,
  healthThreadId,
  variant = 'card',
  showTitle = true,
  initialMessage,
  entityPin,
  autoSend = false,
  conversationId = null,
  onConversationIdChange,
  onAcceleratorConsumed,
}: Props) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { account } = useAuth()
  const { runLlmTask } = useLlmActivity()
  const [quota, setQuota] = useState<LlmUsageQuota | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastModel, setLastModel] = useState<string | null>(null)
  const [allowLlmDataSharing, setAllowLlmDataSharing] = useState(() => readAvaAllowLlmDataSharing())
  const [reportOpen, setReportOpen] = useState(false)
  const [activityTrace, setActivityTrace] = useState<AvaActivityEvent[]>([])
  const [conversationOptions, setConversationOptions] = useState<AvaConversation[]>([])
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null)
  const [imageWarningOpen, setImageWarningOpen] = useState(false)
  const [imageWarningDismiss, setImageWarningDismiss] = useState(false)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const autoSendDoneRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resumeAttemptedRef = useRef(false)

  const thinkingPhrase = useAvaThinkingPhrase(loading)
  const statusLabel = useMemo(() => {
    const last = activityTrace[activityTrace.length - 1]
    if (last) return last.label
    return thinkingPhrase
  }, [activityTrace, thinkingPhrase])
  const avaExpression = useAvaExpression(loading, statusLabel, { context: 'chat' })
  const caregiverName = caregiverFirstName(account?.displayName, account?.email)
  const quotaBlocked = isLlmQuotaExhausted(quota)

  useEffect(() => {
    if (initialMessage?.trim()) {
      setInput(initialMessage.trim())
    }
  }, [initialMessage])

  const loadQuota = useCallback(() => {
    api.llm.quota().then(setQuota).catch(() => setQuota(null))
  }, [])

  useEffect(() => { loadQuota() }, [loadQuota])

  const loadConversationList = useCallback(() => {
    api.ava.listConversations(patientId)
      .then((r) => setConversationOptions(r.items))
      .catch(() => setConversationOptions([]))
  }, [patientId])

  const loadConversationMessages = useCallback((id: string) => {
    api.ava.getMessages(id)
      .then((r) => {
        setMessages(r.messages.map((m) => ({
          role: m.role,
          text: m.content,
          revised: Boolean(m.metadata?.reflection && (m.metadata.reflection as { revised?: boolean }).revised),
        })))
      })
      .catch(() => setMessages([]))
  }, [])

  useEffect(() => {
    loadConversationList()
    resumeAttemptedRef.current = false
  }, [patientId, loadConversationList])

  useEffect(() => {
    if (conversationId) {
      loadConversationMessages(conversationId)
      return
    }
    if (resumeAttemptedRef.current || initialMessage?.trim() || autoSend) return
    resumeAttemptedRef.current = true
    api.ava.listConversations(patientId)
      .then((r) => {
        const latest = r.items[0]
        if (latest) onConversationIdChange?.(latest.id)
      })
      .catch(() => {})
  }, [conversationId, patientId, initialMessage, autoSend, loadConversationMessages, onConversationIdChange])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (overrideText?: string, pinForTurn?: AvaEntityPin) => {
    const text = (overrideText ?? input).trim()
    if (!text || loading) return
    if (isLlmQuotaExhausted(quota)) {
      message.warning(t('ava.quotaExhausted'))
      return
    }

    const pin = pinForTurn ?? entityPin
    const attachmentForTurn = attachment

    if (!overrideText) setInput('')
    setMessages((prev) => [...prev, { role: 'user', text }])
    setLoading(true)
    setActivityTrace([])
    try {
      const res: AvaChatResponse = await runLlmTask(() =>
        api.ava.chatWithActivity(
          patientId,
          {
            message: text,
            healthThreadId,
            conversationId: conversationId ?? undefined,
            attachmentDocumentId: attachmentForTurn?.documentId,
            allowLlmDataSharing,
            entityPin: pin,
          },
          (event) => setActivityTrace((prev) => [...prev, event]),
        ))
      if (res.conversationId) onConversationIdChange?.(res.conversationId)
      loadConversationList()
      setAttachment(null)
      if (res.activityTrace?.length) setActivityTrace(res.activityTrace)
      setLastModel(`${res.provider} · ${res.model}`)
      setQuota(res.quota)
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: res.reply,
        revised: res.reflection.revised,
      }])
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e)
      if (errMsg.includes('402') || errMsg.includes('Franquia') || errMsg.includes('LLM_QUOTA')) {
        message.error(t('ava.quotaExhausted'))
        loadQuota()
      } else {
        message.error(errMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const requestAttachImage = () => {
    if (readAvaImageAttachWarningDismissed()) {
      openFilePicker()
      return
    }
    setImageWarningDismiss(false)
    setImageWarningOpen(true)
  }

  const confirmImageWarning = () => {
    if (imageWarningDismiss) writeAvaImageAttachWarningDismissed(true)
    setImageWarningOpen(false)
    openFilePicker()
  }

  const handleFileSelected = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.warning(t('ava.imageAttachFailed'))
      return
    }
    setUploadingAttachment(true)
    try {
      const doc = await api.documents.upload(patientId, 'exam', file)
      setAttachment({ documentId: doc.id, filename: doc.originalFilename })
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('ava.imageAttachFailed'))
    } finally {
      setUploadingAttachment(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const startNewConversation = () => {
    onConversationIdChange?.(null)
    setMessages([])
    setAttachment(null)
    resumeAttemptedRef.current = true
  }

  const handleConversationSelect = (id: string) => {
    onConversationIdChange?.(id)
    loadConversationMessages(id)
  }

  useEffect(() => {
    if (!autoSend || autoSendDoneRef.current) return
    if (!initialMessage?.trim()) return
    if (quota === null) return
    if (isLlmQuotaExhausted(quota)) return
    autoSendDoneRef.current = true
    onAcceleratorConsumed?.()
    void send(initialMessage.trim(), entityPin)
  }, [autoSend, initialMessage, entityPin, quota, onAcceleratorConsumed])

  const quotaAlert = quota && !quota.quotaBypassed && quota.status !== 'ok' ? (
    <DismissibleHint
      hintId={`ava.quota.${quota.monthlyPeriod}.${quota.status}`}
      type={quota.status === 'exhausted' ? 'error' : 'warning'}
      showIcon
      acknowledge={false}
      style={{ marginBottom: 8 }}
      message={
        quota.status === 'exhausted'
          ? t('ava.quotaExhausted')
          : t('ava.quotaWarn', { percent: quota.usagePercent })
      }
      action={
        <Link to="/settings/plan">
          <Button size="small" type="link">{t('ava.upgradePlan')}</Button>
        </Link>
      }
    />
  ) : null

  const panelClass = [
    'ava-chat-panel',
    variant === 'embedded' && 'ava-chat-panel--embedded',
  ].filter(Boolean).join(' ')

  const userAvatarUrl = account?.avatarUrl ?? null
  const userDisplayName = account?.displayName ?? account?.email ?? null

  const userAvatar = (
    <span title={userDisplayName ?? undefined}>
      <Avatar
        size={AVA_CHAT_USER_STAGE_SIZE}
        src={userAvatarUrl ?? undefined}
        style={{
          backgroundColor: userAvatarUrl ? undefined : '#4F46E5',
          fontSize: 18,
          border: '2px solid rgba(79, 70, 229, 0.2)',
        }}
      >
        {initialsOf(userDisplayName)}
      </Avatar>
    </span>
  )

  return (
    <div className={panelClass}>
      {showTitle && (
        <div style={{ marginBottom: 8 }}>
          <AvaChatHeading />
        </div>
      )}

      {quota && quota.llmEnabled && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '0 18px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <AvaQuotaBar quota={quota} lastModel={lastModel} />
          </div>
          {messages.length > 0 && (
            <Button
              size="small"
              type="text"
              icon={<FileTextOutlined />}
              onClick={() => setReportOpen(true)}
              title={t('ava.report')}
            >
              {t('ava.report')}
            </Button>
          )}
        </div>
      )}

      {!quota?.llmEnabled && messages.length > 0 && (
        <Button
          size="small"
          type="text"
          icon={<FileTextOutlined />}
          onClick={() => setReportOpen(true)}
          style={{ alignSelf: 'flex-end', marginRight: 18 }}
        >
          {t('ava.report')}
        </Button>
      )}

      {quotaAlert}

      {variant === 'embedded' && (
        <div className="ava-chat-panel__conversation-bar">
          <Typography.Text type="secondary" className="ava-chat-panel__conversation-label">
            {t('ava.conversationLabel')}
          </Typography.Text>
          <Select
            size="small"
            className="ava-chat-panel__conversation-select"
            placeholder={t('ava.newConversation')}
            value={conversationId ?? undefined}
            allowClear
            onClear={() => startNewConversation()}
            onChange={(id) => id && handleConversationSelect(id)}
            options={conversationOptions.map((c) => ({
              value: c.id,
              label: c.title ?? t('ava.resumeConversation'),
            }))}
          />
          <Button size="small" type="link" onClick={startNewConversation}>
            {t('ava.newConversation')}
          </Button>
        </div>
      )}

      <div className="ava-chat-stage">
        <div className="ava-chat-stage__ava">
          <div
            className="ava-chat-stage__ava-anchor"
            style={{
              width: AVA_CHAT_STAGE_AVATAR_SIZE,
              height: AVA_CHAT_STAGE_AVATAR_SIZE,
            }}
          >
            <AvaAvatar
              size={AVA_CHAT_STAGE_AVATAR_SIZE}
              analyzing={loading}
              expression={avaExpression}
              className="ava-chat-stage__ava-face"
              neural={false}
              softCrossfade
              crossfadeVariant="lite"
              crossfadeMs={1000}
            />
            {loading && (
              <div className="ava-thinking-stack">
                <AvaThinkingAura text={statusLabel} activityTrace={activityTrace} />
              </div>
            )}
          </div>
        </div>

        <div className="ava-chat-stage__thread">
          <div className="ava-chat-panel__messages">
            {messages.length === 0 && !loading && (
              <Typography.Paragraph className="ava-chat-panel__intro">
                {caregiverName
                  ? t('ava.introPersonal', { name: caregiverName })
                  : t('ava.intro')}
              </Typography.Paragraph>
            )}

            {messages.map((item, idx) => (
              <div
                key={idx}
                className={[
                  'ava-chat-bubble-row',
                  item.role === 'user' ? 'ava-chat-bubble-row--user' : 'ava-chat-bubble-row--ava',
                ].join(' ')}
              >
                <AvaChatBubble
                  role={item.role}
                  text={item.text}
                  revised={item.revised}
                />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="ava-chat-stage__user">
          {userAvatar}
        </div>
      </div>

      <div className="ava-chat-panel__composer">
        <Checkbox
          className="ava-chat-panel__sharing-opt"
          checked={allowLlmDataSharing}
          onChange={(e) => {
            const next = e.target.checked
            setAllowLlmDataSharing(next)
            writeAvaAllowLlmDataSharing(next)
          }}
        >
          <span className="ava-chat-panel__sharing-label">{t('ava.allowDataSharing')}</span>
        </Checkbox>
        <Typography.Paragraph type="secondary" className="ava-chat-panel__sharing-hint">
          {t('ava.allowDataSharingHint')}
        </Typography.Paragraph>
        {attachment && (
          <div className="ava-chat-panel__attachment">
            <PictureOutlined />
            <Typography.Text>{t('ava.attachmentReady', { name: attachment.filename })}</Typography.Text>
            <Button type="link" size="small" onClick={() => setAttachment(null)}>
              {t('ava.removeAttachment')}
            </Button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="ava-chat-panel__file-input"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFileSelected(file)
          }}
        />
        <Input.TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('ava.placeholder')}
          autoSize={{ minRows: 2, maxRows: 4 }}
          disabled={loading || quotaBlocked}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <div className="ava-chat-panel__composer-actions">
          <Button
            icon={<PictureOutlined />}
            onClick={requestAttachImage}
            disabled={loading || quotaBlocked || uploadingAttachment}
            loading={uploadingAttachment}
          >
            {t('ava.attachImage')}
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={loading}
            onClick={() => send()}
            disabled={!input.trim() || quotaBlocked}
          >
            {t('ava.send')}
          </Button>
        </div>
      </div>

      <Modal
        open={imageWarningOpen}
        title={t('ava.imageAttachWarningTitle')}
        onOk={confirmImageWarning}
        onCancel={() => setImageWarningOpen(false)}
        okText={t('ava.attachImage')}
      >
        <Typography.Paragraph>{t('ava.imageAttachWarningBody')}</Typography.Paragraph>
        <Checkbox
          checked={imageWarningDismiss}
          onChange={(e) => setImageWarningDismiss(e.target.checked)}
        >
          {t('ava.imageAttachWarningDontShow')}
        </Checkbox>
      </Modal>

      <AvaReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title={`${t('ava.name')} — ${t('ava.report')}`}
        messages={messages}
      />
    </div>
  )
}
