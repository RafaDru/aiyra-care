import { useRef } from 'react'
import { Alert, Card, Steps, Typography } from 'antd'
import { BrandIntegrationChip, SYNC_CHIP_LOGO_MAX } from '../brands/BrandIntegrationChip.js'
import { SyncOverallIcon } from '../ui/StatusTag.js'
import { SyncDiagnosticMessage } from './SyncDiagnosticsPanel.js'
import { useSyncJobProgress } from '../../hooks/useSyncJobProgress.js'
import {
  fetchGroupHasFailure,
  getSyncPortalProfile,
  isInteractiveLoginMessage,
  mainStepStatus,
  resolveSyncStepIndex,
  type SyncablePortalType,
} from '../../lib/sync-portal-profile.js'
import type { SyncJobOverallStatus, SyncStepDetail } from '../../lib/sync-job-progress.js'

const { Text } = Typography

const CARD_BODY_STYLE = { padding: '10px 12px' }
const CARD_MARGIN = { marginBottom: 8 }

export function formatSyncCardTime(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function resolveSnapshotOverallStatus(
  status: string,
  portalType: SyncablePortalType,
  stepDetails: Record<string, { status: string }>,
  result?: { warnings?: string[] } | null,
): SyncJobOverallStatus {
  if (status === 'failed') return 'failed'
  if (status === 'running' || status === 'pending') return 'running'
  const profile = getSyncPortalProfile(portalType)
  const partial = (result?.warnings?.length ?? 0) > 0
    || fetchGroupHasFailure(stepDetails, profile)
  return partial ? 'partial' : 'success'
}

function StatusIcon({ status }: { status: SyncJobOverallStatus }) {
  return <SyncOverallIcon status={status} />
}

export interface SyncJobCardViewProps {
  portalType: SyncablePortalType
  status: SyncJobOverallStatus
  currentStep: number
  message: string
  stepDetails: Record<string, SyncStepDetail>
  timeLabel?: string | null
  noveltyText?: string | null
  longRunning?: boolean
}

export function SyncJobCardView({
  portalType,
  status,
  currentStep,
  message,
  stepDetails,
  timeLabel,
  noveltyText,
  longRunning,
}: SyncJobCardViewProps) {
  const profile = getSyncPortalProfile(portalType)
  const loginDetail = stepDetails.login
  const showInteractiveLoginHint = status === 'running'
    && loginDetail?.status === 'running'
    && isInteractiveLoginMessage(loginDetail.message || message)

  const footer = noveltyText || (status !== 'running' ? message : '')
  const runningMessage = message && !showInteractiveLoginHint && status === 'running' ? message : ''

  return (
    <Card size="small" style={CARD_MARGIN} styles={{ body: CARD_BODY_STYLE }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <BrandIntegrationChip
            brand={portalType}
            label={profile.label}
            fullWidth
            logoMaxSize={SYNC_CHIP_LOGO_MAX}
          />
          {timeLabel && (
            <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 2 }}>
              {timeLabel}
            </Text>
          )}
        </div>
        <StatusIcon status={status} />
      </div>

      {showInteractiveLoginHint && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 8, fontSize: 12 }}
          message="Login manual"
          description={
            <Text style={{ fontSize: 11 }}>{loginDetail?.message || message}</Text>
          }
        />
      )}

      <Steps
        size="small"
        progressDot
        current={currentStep}
        items={profile.mainSteps.map((s, i) => ({
          title: i === currentStep ? <Text style={{ fontSize: 10 }}>{s.title}</Text> : '',
          status: mainStepStatus(status, currentStep, i, s.key),
        }))}
      />

      {runningMessage && (
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
          {runningMessage}
        </Text>
      )}

      {footer && status !== 'running' && (
        footer.length > 140 || status === 'failed'
          ? (
            <SyncDiagnosticMessage
              variant={status === 'failed' ? 'error' : 'warning'}
              title={status === 'failed' ? 'Erro na sincronização' : 'Avisos'}
              message={footer}
              collapsedMaxHeight={72}
            />
          )
          : (
            <Text
              type={status === 'partial' ? 'warning' : 'secondary'}
              style={{ fontSize: 11, display: 'block', marginTop: 8 }}
            >
              {footer}
            </Text>
          )
      )}

      {longRunning && status === 'running' && (
        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 6 }}>
          Pode levar vários minutos. Você pode continuar navegando.
        </Text>
      )}
    </Card>
  )
}

export function SyncJobLiveCard({
  jobId,
  portalType,
  onTerminal,
}: {
  jobId: string
  portalType: SyncablePortalType
  onTerminal?: (status: SyncJobOverallStatus) => void
}) {
  const onTerminalRef = useRef(onTerminal)
  onTerminalRef.current = onTerminal

  const {
    portalType: resolvedPortal,
    currentStep,
    message,
    status,
    stepDetails,
    longRunning,
  } = useSyncJobProgress(jobId, portalType, (terminalStatus) => {
    onTerminalRef.current?.(terminalStatus)
  })

  return (
    <SyncJobCardView
      portalType={resolvedPortal}
      status={status}
      currentStep={currentStep}
      message={message}
      stepDetails={stepDetails}
      longRunning={longRunning}
    />
  )
}

export interface SyncJobHistorySnapshot {
  portalType: SyncablePortalType
  status: string
  step: string | null
  message: string | null
  stepDetails: Record<string, SyncStepDetail>
  finishedAt: Date | null
  noveltyText: string | null
  result?: { warnings?: string[] } | null
}

export function SyncJobHistoryCard({ snapshot }: { snapshot: SyncJobHistorySnapshot }) {
  const portalType = snapshot.portalType
  const profile = getSyncPortalProfile(portalType)
  const stepDetails = snapshot.stepDetails
  const overall = resolveSnapshotOverallStatus(
    snapshot.status,
    portalType,
    stepDetails,
    snapshot.result,
  )
  const currentStep = overall === 'running'
    ? resolveSyncStepIndex(snapshot.step ?? 'pending', portalType, stepDetails)
    : profile.mainSteps.length - 1

  const timeLabel = snapshot.finishedAt
    ? formatSyncCardTime(snapshot.finishedAt)
    : null

  return (
    <SyncJobCardView
      portalType={portalType}
      status={overall}
      currentStep={currentStep}
      message={snapshot.message ?? ''}
      stepDetails={stepDetails}
      timeLabel={timeLabel}
      noveltyText={snapshot.noveltyText}
    />
  )
}
