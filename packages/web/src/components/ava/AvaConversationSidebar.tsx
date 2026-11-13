import { useEffect, useState } from 'react'
import { Button, Typography } from 'antd'
import {
  CommentOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { AvaConversation } from '../../lib/api.types.js'
import { conversationListLabel } from '../../lib/ava-conversation-label.js'
import { useMediaQuery } from '../../hooks/useMediaQuery.js'

interface Props {
  conversations: AvaConversation[]
  activeConversationId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onArchive?: () => void
  onDelete?: () => void
}

const NARROW_QUERY = '(max-width: 520px)'

export function AvaConversationSidebar({
  conversations,
  activeConversationId,
  onSelect,
  onNew,
  onArchive,
  onDelete,
}: Props) {
  const { t } = useTranslation()
  const narrow = useMediaQuery(NARROW_QUERY)
  const [expanded, setExpanded] = useState(() => !narrow)

  useEffect(() => {
    if (narrow) setExpanded(false)
  }, [narrow])

  const toggle = () => setExpanded((v) => !v)

  const railOnly = !expanded

  return (
    <>
      {narrow && expanded && (
        <button
          type="button"
          className="ava-conversation-sidebar__backdrop"
          aria-label={t('ava.conversationsSidebarCollapse')}
          onClick={() => setExpanded(false)}
        />
      )}
      <aside
        className={[
          'ava-conversation-sidebar',
          expanded ? 'ava-conversation-sidebar--expanded' : 'ava-conversation-sidebar--collapsed',
          narrow && expanded && 'ava-conversation-sidebar--overlay',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={t('ava.sessionsTitle')}
      >
        <div className="ava-conversation-sidebar__top">
          <Button
            type="text"
            size="small"
            className="ava-conversation-sidebar__toggle"
            icon={expanded ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
            onClick={toggle}
            aria-expanded={expanded}
            aria-label={
              expanded ? t('ava.conversationsSidebarCollapse') : t('ava.conversationsSidebarExpand')
            }
          />
          {railOnly && (
            <Button
              type="text"
              size="small"
              className="ava-conversation-sidebar__rail-new"
              icon={<PlusOutlined />}
              onClick={onNew}
              aria-label={t('ava.newConversation')}
            />
          )}
        </div>

        {expanded && (
          <div className="ava-conversation-sidebar__body">
            <Typography.Text type="secondary" className="ava-conversation-sidebar__section">
              {t('ava.sessionsTitle')}
            </Typography.Text>
            <Button
              type="primary"
              size="small"
              block
              icon={<PlusOutlined />}
              className="ava-conversation-sidebar__new"
              onClick={onNew}
            >
              {t('ava.newConversation')}
            </Button>
            <ul className="ava-conversation-sidebar__list" role="listbox">
              {conversations.map((c) => {
                const active = c.id === activeConversationId
                const label = conversationListLabel(c, t('ava.resumeConversation'))
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={[
                        'ava-conversation-sidebar__item',
                        active && 'ava-conversation-sidebar__item--active',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => onSelect(c.id)}
                      title={label}
                    >
                      <CommentOutlined className="ava-conversation-sidebar__item-icon" />
                      <span className="ava-conversation-sidebar__item-label">{label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {activeConversationId && (onArchive || onDelete) && (
              <div className="ava-conversation-sidebar__actions">
                {onArchive && (
                  <Button type="link" size="small" onClick={onArchive}>
                    {t('ava.archiveConversation')}
                  </Button>
                )}
                {onDelete && (
                  <Button type="link" size="small" danger onClick={onDelete}>
                    {t('ava.deleteConversation')}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {railOnly && conversations.length > 0 && (
          <span className="ava-conversation-sidebar__rail-hint" aria-hidden="true">
            <CommentOutlined />
            <span className="ava-conversation-sidebar__rail-count">{conversations.length}</span>
          </span>
        )}
      </aside>
    </>
  )
}
