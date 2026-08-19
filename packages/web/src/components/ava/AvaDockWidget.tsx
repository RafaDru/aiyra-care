import { useEffect, useState } from 'react'
import { Badge, Button, Drawer, Space } from 'antd'
import { MessageFilled } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { AvaAvatar } from './AvaAvatar.js'
import { AvaChatPanel } from './AvaChatPanel.js'
import { AvaDockFlyingBubble } from './AvaDockFlyingBubble.js'
import { useAvaDockIntro } from './useAvaDockIntro.js'
import { AVA_CHAT_DRAWER_AVATAR_SIZE } from './ava-sizes.js'
import { AvaChatHeading } from './AvaChatHeading.js'
import { api } from '../../lib/api.js'
import type { LlmUsageQuota } from '../../lib/api.types.js'
import { useLlmActivity } from '../../contexts/LlmActivityContext.js'

/** Ava no header: círculo grande, balão à esquerda, CTA após intro. */
const AVA_SIZE_RATIO = 1

interface Props {
  patientId: string
  healthThreadId?: string
  /** Diâmetro do avatar do paciente no header (px). */
  patientAvatarSize?: number
}

export function AvaDockWidget({
  patientId,
  healthThreadId,
  patientAvatarSize = 96,
}: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { active: llmAnalyzing } = useLlmActivity()
  const [quota, setQuota] = useState<LlmUsageQuota | null>(null)
  const { phase, introDone } = useAvaDockIntro()

  const avaSize = Math.round(patientAvatarSize * AVA_SIZE_RATIO)
  const chatBadgeSize = Math.max(28, Math.round(avaSize * 0.32))
  const chatIconSize = Math.max(15, Math.round(chatBadgeSize * 0.52))

  useEffect(() => {
    api.llm.quota().then(setQuota).catch(() => setQuota(null))
  }, [open])

  const quotaDot = quota?.status === 'exhausted' ? 'error' : quota?.status === 'warn' ? 'warning' : undefined

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ava-dock-trigger"
        aria-label={t('ava.openChat')}
      >
        <div className="ava-dock-stack">
          <div className="ava-dock-hero">
            <AvaDockFlyingBubble phase={phase} />
            <div className="ava-dock-avatar-wrap">
              <Badge dot={quotaDot !== undefined} status={quotaDot} offset={[-2, 2]}>
                <AvaAvatar
                  size={avaSize}
                  className="ava-dock-avatar"
                  analyzing={llmAnalyzing}
                />
              </Badge>
              <span
                className="ava-dock-chat-badge"
                style={{ width: chatBadgeSize, height: chatBadgeSize }}
                aria-hidden="true"
              >
                <MessageFilled style={{ fontSize: chatIconSize }} />
              </span>
            </div>
          </div>
          <div className="ava-dock-cta-slot">
            <span
              className={[
                'ava-dock-cta-pill',
                introDone && 'ava-dock-cta-pill--show',
              ].filter(Boolean).join(' ')}
            >
              {t('ava.dockCta')}
            </span>
          </div>
        </div>
      </button>

      <Drawer
        rootClassName="ava-chat-drawer"
        styles={{
          wrapper: {
            width: '45vw',
            minWidth: 360,
            maxWidth: '92vw',
          },
        }}
        title={
          <Space size={12} align="start">
            <AvaAvatar size={AVA_CHAT_DRAWER_AVATAR_SIZE} analyzing={llmAnalyzing} />
            <AvaChatHeading />
          </Space>
        }
        placement="right"
        open={open}
        onClose={() => setOpen(false)}
        destroyOnClose={false}
        extra={
          <Button type="link" size="small" onClick={() => setOpen(false)}>
            {t('common.close')}
          </Button>
        }
      >
        <AvaChatPanel
          patientId={patientId}
          healthThreadId={healthThreadId}
          variant="embedded"
          showTitle={false}
        />
      </Drawer>
    </>
  )
}
