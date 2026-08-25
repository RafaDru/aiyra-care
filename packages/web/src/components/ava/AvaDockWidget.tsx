import { useEffect, useState } from 'react'
import { Badge, Button, Drawer, Space, Typography } from 'antd'
import { MessageFilled } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { AvaAvatar } from './AvaAvatar.js'
import { AvaChatPanel } from './AvaChatPanel.js'
import { AvaDockFlyingBubble } from './AvaDockFlyingBubble.js'
import { AvaPatientLensSelect } from './AvaPatientLensSelect.js'
import { useAvaDockIntro } from './useAvaDockIntro.js'
import { AVA_CHAT_DRAWER_AVATAR_SIZE } from './ava-sizes.js'
import { AvaChatHeading } from './AvaChatHeading.js'
import { api } from '../../lib/api.js'
import type { LlmUsageQuota, Patient } from '../../lib/api.types.js'
import { useLlmActivity } from '../../contexts/LlmActivityContext.js'

/** Ava no header: círculo grande, balão à esquerda, CTA após intro. */
const AVA_SIZE_RATIO = 1

interface Props {
  patientId: string
  patients: Patient[]
  onPatientChange: (patientId: string) => void
  routePatientId?: string | null
  lensOverridesRoute?: boolean
  healthThreadId?: string
  /** Diâmetro do avatar do paciente no header (px). */
  patientAvatarSize?: number
}

export function AvaDockWidget({
  patientId,
  patients,
  onPatientChange,
  routePatientId,
  lensOverridesRoute,
  healthThreadId,
  patientAvatarSize = 96,
}: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { active: llmAnalyzing } = useLlmActivity()
  const [quota, setQuota] = useState<LlmUsageQuota | null>(null)
  const { phase, introDone } = useAvaDockIntro()
  const [chatEpoch, setChatEpoch] = useState(0)

  const avaSize = Math.round(patientAvatarSize * AVA_SIZE_RATIO)
  const chatBadgeSize = Math.max(28, Math.round(avaSize * 0.32))
  const chatIconSize = Math.max(15, Math.round(chatBadgeSize * 0.52))

  useEffect(() => {
    api.llm.quota().then(setQuota).catch(() => setQuota(null))
  }, [open])

  const handlePatientChange = (id: string) => {
    if (id === patientId) return
    onPatientChange(id)
    setChatEpoch((n) => n + 1)
  }

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
          header: { display: 'none' },
          body: { padding: 0 },
        }}
        placement="right"
        open={open}
        onClose={() => setOpen(false)}
        destroyOnClose={false}
      >
        <div className="ava-chat-shell">
          <div className="ava-chat-shell__head">
            <Space size={12} align="center" wrap>
              <AvaAvatar size={AVA_CHAT_DRAWER_AVATAR_SIZE} analyzing={llmAnalyzing} />
              <div>
                <AvaChatHeading />
                <Space size={8} align="center" style={{ marginTop: 4 }}>
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    {t('ava.patientLensLabel')}
                  </Typography.Text>
                  <AvaPatientLensSelect
                    patients={patients}
                    value={patientId}
                    onChange={handlePatientChange}
                    routePatientId={routePatientId}
                  />
                </Space>
                {lensOverridesRoute && (
                  <Typography.Text type="warning" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
                    {t('ava.patientLensOverrideHint')}
                  </Typography.Text>
                )}
              </div>
            </Space>
            <Button type="link" size="small" onClick={() => setOpen(false)}>
              {t('common.close')}
            </Button>
          </div>
          <div className="ava-chat-shell__body">
            <AvaChatPanel
              key={`${patientId}-${chatEpoch}`}
              patientId={patientId}
              healthThreadId={healthThreadId}
              variant="embedded"
              showTitle={false}
            />
          </div>
        </div>
      </Drawer>
    </>
  )
}
