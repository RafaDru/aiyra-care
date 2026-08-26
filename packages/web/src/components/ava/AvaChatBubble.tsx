import { Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import { AvaMarkdown } from './AvaMarkdown.js'

interface Props {
  role: 'user' | 'assistant'
  text: string
  revised?: boolean
}

/** Balão de conversa unificado (Ava e usuário) — markdown + rabinho espelhado. */
export function AvaChatBubble({ role, text, revised }: Props) {
  const { t } = useTranslation()
  const isUser = role === 'user'

  return (
    <div
      className={[
        'ava-chat-bubble',
        isUser ? 'ava-chat-bubble--user' : 'ava-chat-bubble--ava',
      ].join(' ')}
    >
      <div className="ava-chat-bubble__body">
        <span
          className={[
            'ava-chat-bubble__tag',
            isUser && 'ava-chat-bubble__tag--user',
          ].filter(Boolean).join(' ')}
        >
          {isUser ? t('ava.you') : t('ava.name')}
          {!isUser && revised && (
            <Tag color="blue" style={{ marginLeft: 6, fontSize: 10 }}>
              {t('ava.revised')}
            </Tag>
          )}
        </span>
        <AvaMarkdown content={text} />
      </div>
    </div>
  )
}
