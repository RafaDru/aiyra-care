import { useTranslation } from 'react-i18next'
import './ava-chat-heading.css'

/** Título do chat: Ava em destaque + subtítulo. */
export function AvaChatHeading() {
  const { t } = useTranslation()
  return (
    <div className="ava-chat-heading">
      <span className="ava-chat-heading__name">{t('ava.name')}</span>
      <span className="ava-chat-heading__subtitle">{t('ava.subtitle')}</span>
    </div>
  )
}
