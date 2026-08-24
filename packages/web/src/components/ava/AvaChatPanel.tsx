import { useCallback, useEffect, useRef, useState } from 'react'
import { Avatar, Button, Checkbox, Input, Tag, Typography, App } from 'antd'
import { FileTextOutlined, SendOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import type { AvaChatResponse, LlmUsageQuota } from '../../lib/api.types.js'
import { useLlmActivity } from '../../contexts/LlmActivityContext.js'
import { useAuth } from '../../contexts/AuthContext.js'
import { DismissibleHint } from '../ui/DismissibleHint.js'
import { AvaAvatar } from './AvaAvatar.js'
import { AvaQuotaBar } from './AvaQuotaBar.js'
import { AvaChatHeading } from './AvaChatHeading.js'
import { useAvaThinkingPhrase } from './useAvaThinkingPhrase.js'
import {
  AVA_CHAT_AVATAR_SIZE,
  AVA_CHAT_THINKING_AVATAR_SIZE,
} from './ava-sizes.js'
import {
  readAvaAllowLlmDataSharing,
  writeAvaAllowLlmDataSharing,
} from '../../lib/ava-llm-preferences.js'
import { AvaMarkdown } from './AvaMarkdown.js'
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
}

/** Iniciais do nome para o fallback do avatar do usuário. */
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const thinkingPhrase = useAvaThinkingPhrase(loading)

  const loadQuota = useCallback(() => {
    api.llm.quota().then(setQuota).catch(() => setQuota(null))
  }, [])

  useEffect(() => { loadQuota() }, [loadQuota])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    if (quota && quota.totalTokensRemaining <= 0) {
      message.warning(t('ava.quotaExhausted'))
      return
    }

    const history = messages.slice(-8).map((m) => ({
      role: m.role,
      content: m.text,
    }))

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text }])
    setLoading(true)
    try {
      const res: AvaChatResponse = await runLlmTask(() =>
        api.ava.chat(patientId, {
          message: text,
          healthThreadId,
          history,
          allowLlmDataSharing,
        }))
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

  const quotaAlert = quota && quota.status !== 'ok' ? (
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

  // Identidade visual do usuário no chat (você à direita da conversa)
  const userAvatarUrl = account?.avatarUrl ?? null
  const userDisplayName = account?.displayName ?? account?.email ?? null

  const userAvatar = (
    <Avatar
      size={40}
      src={userAvatarUrl ?? undefined}
      style={{
        backgroundColor: userAvatarUrl ? undefined : '#4F46E5',
        fontSize: 15,
        flexShrink: 0,
        border: '1.5px solid rgba(79, 70, 229, 0.25)',
      }}
    >
      {initialsOf(userDisplayName)}
    </Avatar>
  )

  return (
    <div className={panelClass}>
      <div className="ava-chat-panel__disclaimer">
        <DismissibleHint
          hintId={`ava.disclaimer.${patientId}`}
          type="info"
          acknowledge={false}
          showIcon={false}
          message={t('ava.chatDisclaimerShort')}
          style={{ marginBottom: 0, padding: 0, background: 'transparent', border: 'none' }}
        />
      </div>

      {showTitle && (
        <div style={{ marginBottom: 8 }}>
          <AvaChatHeading />
        </div>
      )}

      {quota && quota.llmEnabled && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
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

      {/* Relatório também disponível sem cota ativa */}
      {!quota?.llmEnabled && messages.length > 0 && (
        <Button
          size="small"
          type="text"
          icon={<FileTextOutlined />}
          onClick={() => setReportOpen(true)}
          style={{ alignSelf: 'flex-end' }}
        >
          {t('ava.report')}
        </Button>
      )}

      {quotaAlert}

      <div className="ava-chat-panel__messages">
        {messages.length === 0 && (
          <Typography.Paragraph className="ava-chat-panel__intro">
            {t('ava.intro')}
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
            {item.role === 'assistant' && <AvaAvatar size={AVA_CHAT_AVATAR_SIZE} />}
            <div
              className={[
                'ava-chat-bubble',
                item.role === 'user' ? 'ava-chat-bubble--user' : 'ava-chat-bubble--ava',
              ].join(' ')}
            >
              {item.role === 'assistant' && (
                <span className="ava-chat-bubble__tag">
                  {t('ava.name')}
                  {item.revised && (
                    <Tag color="blue" style={{ marginLeft: 6, fontSize: 10 }}>{t('ava.revised')}</Tag>
                  )}
                </span>
              )}
              {item.role === 'assistant' ? <AvaMarkdown content={item.text} /> : item.text}
            </div>
            {item.role === 'user' && (
              <span className="ava-chat-user-avatar" title={userDisplayName ?? undefined}>
                {userAvatar}
              </span>
            )}
          </div>
        ))}

        {loading && (
          <div className="ava-chat-bubble-row ava-chat-bubble-row--ava ava-chat-bubble-row--thinking">
            <AvaAvatar size={AVA_CHAT_THINKING_AVATAR_SIZE} analyzing />
            {/* Balão de pensamento: contorno pontilhado + frases rotativas */}
            <div className="ava-chat-thought">
              <span className="ava-chat-thought__dot ava-chat-thought__dot--1" aria-hidden="true" />
              <span className="ava-chat-thought__dot ava-chat-thought__dot--2" aria-hidden="true" />
              <span className="ava-chat-thinking-text">{thinkingPhrase}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
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
        <Input.TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('ava.placeholder')}
          autoSize={{ minRows: 2, maxRows: 4 }}
          disabled={loading || (quota?.totalTokensRemaining ?? 1) <= 0}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={loading}
          onClick={() => send()}
          disabled={!input.trim() || (quota?.totalTokensRemaining ?? 1) <= 0}
          style={{ marginTop: 8, width: '100%' }}
        >
          {t('ava.send')}
        </Button>
      </div>

      <AvaReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title={`${t('ava.name')} — ${t('ava.report')}`}
        messages={messages}
      />
    </div>
  )
}
