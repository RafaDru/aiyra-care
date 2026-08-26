import { useEffect, useState } from 'react'
import { Badge, Button, Drawer, Typography } from 'antd'
import { MessageFilled } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { AvaAvatar } from './AvaAvatar.js'
import { AvaChatPanel } from './AvaChatPanel.js'
import { AvaDockFlyingBubble } from './AvaDockFlyingBubble.js'
import { AvaPatientLensChips } from './AvaPatientLensChips.js'
import { useAvaDockIntro } from './useAvaDockIntro.js'
import { useAvaExpression } from './useAvaExpression.js'
import { caregiverFirstName } from '../../lib/ava-personalization.js'
import { api } from '../../lib/api.js'
import type { LlmUsageQuota, Patient } from '../../lib/api.types.js'
import { isLlmQuotaExhausted } from '../../lib/llm-quota.js'
import { useAuth } from '../../contexts/AuthContext.js'
import { useLlmActivity } from '../../contexts/LlmActivityContext.js'
import type { AvaOpenRequest } from '../../lib/ava-dock-bus.js'

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
  openRequest?: AvaOpenRequest | null
  openRequestEpoch?: number
  onOpenRequestConsumed?: () => void
}

export function AvaDockWidget({
  patientId,
  patients,
  onPatientChange,
  routePatientId,
  lensOverridesRoute,
  healthThreadId,
  patientAvatarSize = 96,
  openRequest,
  openRequestEpoch = 0,
  onOpenRequestConsumed,
}: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { active: llmAnalyzing } = useLlmActivity()
  const { account } = useAuth()
  const caregiverName = caregiverFirstName(account?.displayName, account?.email)
  const [quota, setQuota] = useState<LlmUsageQuota | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const { phase, introDone } = useAvaDockIntro()
  const dockExpression = useAvaExpression(llmAnalyzing, '', {
    context: 'dock',
    introPhase: phase,
  })
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
    setConversationId(null)
    setChatEpoch((n) => n + 1)
  }

  useEffect(() => {
    if (!openRequest) return
    setOpen(true)
  }, [openRequest, openRequestEpoch])

  const quotaDot = quota?.quotaBypassed
    ? undefined
    : quota?.status === 'exhausted'
      ? 'error'
      : quota?.status === 'warn'
        ? 'warning'
        : undefined

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
            <AvaDockFlyingBubble phase={phase} caregiverName={caregiverName} />
            <div className="ava-dock-avatar-wrap">
              <Badge dot={quotaDot !== undefined} status={quotaDot} offset={[-2, 2]}>
                <AvaAvatar
                  size={avaSize}
                  className="ava-dock-avatar"
                  analyzing={llmAnalyzing}
                  expression={dockExpression}
                  softCrossfade
                  crossfadeMs={2200}
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
            width: '52vw',
            minWidth: 420,
            maxWidth: 720,
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
            <div className="ava-chat-shell__head-main">
              <Typography.Text type="secondary" className="ava-chat-shell__head-label">
                {t('ava.patientLensLabel')}
              </Typography.Text>
              <AvaPatientLensChips
                patients={patients}
                value={patientId}
                onChange={handlePatientChange}
              />
              {lensOverridesRoute && (
                <Typography.Text type="warning" className="ava-chat-shell__head-hint">
                  {t('ava.patientLensOverrideHint')}
                </Typography.Text>
              )}
            </div>
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
              initialMessage={openRequest?.initialMessage}
              entityPin={openRequest?.entityPin}
              autoSend={openRequest?.autoSend}
              conversationId={conversationId}
              onConversationIdChange={setConversationId}
              onAcceleratorConsumed={onOpenRequestConsumed}
            />
          </div>
        </div>
      </Drawer>
    </>
  )
}
