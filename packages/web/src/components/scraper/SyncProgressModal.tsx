import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Steps, Typography, Button, Space, Descriptions, List, Tag, Alert } from 'antd'
import { CheckCircleFilled, CloseCircleFilled, LoadingOutlined, UserAddOutlined } from '@ant-design/icons'
import { SyncDiagnosticsPanel, SyncDiagnosticMessage } from './SyncDiagnosticsPanel.js'
import { SyncOverallIcon } from '../ui/StatusTag.js'
import { api } from '../../lib/api.js'
import {
  fetchGroupHasFailure,
  getSyncPortalProfile,
  isFleuryOtpLoginMessage,
  isFleuryOtpInAppMessage,
  isInteractiveLoginMessage,
  mainStepStatus,
  resolveSubstepStatus,
  resolveSyncStepIndex,
  type SyncablePortalType,
  type SyncPortalProfile,
} from '../../lib/sync-portal-profile.js'
import {
  isFatalSyncJobFailure,
  isSyncJobFinished,
  SYNC_FALLBACK_CHECK_MS,
  SYNC_LONG_RUNNING_HINT_MS,
  SYNC_STREAM_STALE_MS,
} from '../../lib/sync-job-progress.js'
import { openSyncJobStream, type SyncProgressStreamPayload } from '../../lib/sync-job-stream.js'
import { RegisterAmilDependentModal, type UnmatchedBeneficiary } from './RegisterAmilDependentModal.js'
import { FleuryOtpSyncHint } from './FleuryOtpSyncHint.js'
import { FleuryOtpSyncInput } from './FleuryOtpSyncInput.js'

const { Text, Title } = Typography

interface SyncResult {
  exams: number
  medicalRecords: number
  authorizations: number
  authorizationItems: number
  updatedAuthorizations: number
  total: number
  authorizationDetails: Array<{
    solicitationNumber?: string
    classification?: string
    doctorName?: string
    itemCount: number
    action: 'created' | 'updated'
    linkedConsultaId?: string
    linkedConsultaDate?: string
    beneficiaryName?: string
  }>
  beneficiaryDetails?: Array<{
    name: string
    marcaOtica: string
    role: 'holder' | 'dependent'
    matched: boolean
    patientId?: string
    patientName?: string
    authorizationsImported: number
    authorizationsUpdated: number
  }>
  unmatchedBeneficiaries?: UnmatchedBeneficiary[]
  warnings?: string[]
  novelty?: {
    portalExams?: number
    portalAttendances?: number
    newExamRecords?: number
    skippedExamRecords?: number
    filesDownloaded?: number
    filesSkipped?: number
  }
}

interface SyncStepDetail {
  status: 'running' | 'success' | 'failed'
  message: string
}

interface Props {
  jobId: string | null
  portalType?: SyncablePortalType | null
  holderPatientId?: string
  onDone: () => void
  onError: (msg: string) => void
  onResync?: () => void
}

const LONG_RUNNING_HINT_MS = SYNC_LONG_RUNNING_HINT_MS
const DEFAULT_PORTAL: SyncablePortalType = 'unimed'

function isJobFinished(p: { step: string; status: string; result?: SyncResult }) {
  return isSyncJobFinished(p)
}

function isFatalJobFailure(step: string, status: string): boolean {
  return isFatalSyncJobFailure(step, status)
}

function formatBeneficiaryName(name: string): string {
  return name
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function SyncSummary({
  profile,
  result,
  warnings,
  holderPatientId,
  onRegister,
}: {
  profile: SyncPortalProfile
  result: SyncResult
  warnings: string[]
  holderPatientId?: string
  onRegister: (b: UnmatchedBeneficiary) => void
}) {
  const { t } = useTranslation()
  const { summary } = profile
  const beneficiaries = result.beneficiaryDetails ?? []
  const unmatched = result.unmatchedBeneficiaries ?? []

  return (
    <>
      {summary.showWarnings && warnings.length > 0 && (
        <SyncDiagnosticsPanel
          variant="warning"
          title={t('modals.syncStepsFailed')}
          items={warnings}
          collapsedMaxHeight={96}
        />
      )}

      {summary.showBeneficiaries && beneficiaries.length > 0 && (
        <List
          size="small"
          header={<Text strong>{t('syncProgress.beneficiariesHeader')}</Text>}
          style={{ marginTop: 12, background: '#fff', borderRadius: 6, padding: '0 8px' }}
          dataSource={beneficiaries}
          renderItem={(b) => (
            <List.Item>
              <Space wrap>
                <Tag color={b.role === 'holder' ? 'blue' : 'purple'}>
                  {b.role === 'holder' ? t('syncProgress.roleHolder') : t('syncProgress.roleDependent')}
                </Tag>
                <Text strong>{formatBeneficiaryName(b.name)}</Text>
                <Text type="secondary">{t('syncProgress.arrowTo')} {b.patientName}</Text>
                <Tag color="green">{t('syncProgress.authorizationsNew', { count: b.authorizationsImported })}</Tag>
                {b.authorizationsUpdated > 0 && (
                  <Tag color="geekblue">{t('syncProgress.authorizationsUpdated', { count: b.authorizationsUpdated })}</Tag>
                )}
              </Space>
            </List.Item>
          )}
        />
      )}

      {summary.showUnmatchedDependents && unmatched.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <Alert
            type="info"
            showIcon
            message={t('syncProgress.unmatchedDependentsTitle')}
            description={t('syncProgress.unmatchedDependentsDesc')}
            style={{ marginBottom: 8 }}
          />
          <List
            size="small"
            dataSource={unmatched}
            style={{ background: '#fff', borderRadius: 6, padding: '0 8px' }}
            renderItem={(b) => (
              <List.Item
                actions={holderPatientId ? [
                  <Button
                    key="register"
                    type="link"
                    icon={<UserAddOutlined />}
                    onClick={() => onRegister(b)}
                  >
                    {t('syncProgress.register')}
                  </Button>,
                ] : undefined}
              >
                <Space wrap>
                  <Text strong>{formatBeneficiaryName(b.name)}</Text>
                  <Tag>{t('syncProgress.guidesOnPortal', { count: b.authorizationCount })}</Tag>
                  {b.cpf && <Text type="secondary">{t('syncProgress.cpfPrefix', { cpf: b.cpf })}</Text>}
                </Space>
              </List.Item>
            )}
          />
        </div>
      )}

      <Descriptions column={1} size="small" style={{ marginTop: 12 }}>
      {summary.showExams && (
        <Descriptions.Item label={t('syncProgress.newExams')}>{result.exams}</Descriptions.Item>
      )}
      {result.novelty && (
        <>
          {result.novelty.portalExams != null && (
            <Descriptions.Item label={t('syncProgress.examsOnPortal')}>{result.novelty.portalExams}</Descriptions.Item>
          )}
          {result.novelty.skippedExamRecords != null && (
            <Descriptions.Item label={t('syncProgress.examsKnown')}>{result.novelty.skippedExamRecords}</Descriptions.Item>
          )}
          {result.novelty.filesDownloaded != null && (
            <Descriptions.Item label={t('syncProgress.filesDownloaded')}>{result.novelty.filesDownloaded}</Descriptions.Item>
          )}
          {result.novelty.filesSkipped != null && (
            <Descriptions.Item label={t('syncProgress.filesCached')}>{result.novelty.filesSkipped}</Descriptions.Item>
          )}
        </>
      )}
        {summary.showMedicalRecords && (
          <Descriptions.Item label={t('syncProgress.newConsults')}>{result.medicalRecords}</Descriptions.Item>
        )}
        {summary.showAuthorizations && (
          <>
            <Descriptions.Item label={t('syncProgress.newAuthorizations')}>{result.authorizations}</Descriptions.Item>
            <Descriptions.Item label={t('syncProgress.updatedAuthorizations')}>{result.updatedAuthorizations}</Descriptions.Item>
            <Descriptions.Item label={t('syncProgress.itemsProcedures')}>{result.authorizationItems}</Descriptions.Item>
          </>
        )}
        <Descriptions.Item label={t('syncProgress.totalChanged')}><Text strong>{result.total}</Text></Descriptions.Item>
      </Descriptions>

      {summary.showAuthorizations && result.authorizationDetails?.length > 0 && (
        <List
          size="small"
          header={<Text strong>{t('syncProgress.syncedOrdersHeader')}</Text>}
          style={{ marginTop: 12, background: '#fff', borderRadius: 6, padding: '0 8px', maxHeight: 200, overflow: 'auto' }}
          dataSource={result.authorizationDetails}
          renderItem={(d) => (
            <List.Item>
              <Space wrap>
                <Tag color={d.action === 'created' ? 'green' : 'blue'}>
                  {d.action === 'created' ? t('syncProgress.actionNew') : t('syncProgress.actionUpdated')}
                </Tag>
                <Text>
                  {d.solicitationNumber
                    ? t('syncProgress.orderNumber', { number: d.solicitationNumber })
                    : t('syncProgress.noOrderNumber')}
                </Text>
                {d.beneficiaryName && (
                  <Text type="secondary">{formatBeneficiaryName(d.beneficiaryName)}</Text>
                )}
                {d.classification && <Text type="secondary">{d.classification}</Text>}
              </Space>
            </List.Item>
          )}
        />
      )}

      {result.total === 0 && beneficiaries.length === 0 && unmatched.length === 0 && (
        <Text type="warning" style={{ display: 'block', marginTop: 8 }}>{t('syncProgress.noChangesFound')}</Text>
      )}
    </>
  )
}

export function SyncProgressModal({
  jobId,
  portalType: portalTypeProp,
  holderPatientId,
  onDone,
  onError,
  onResync,
}: Props) {
  const { t } = useTranslation()
  const [resolvedPortal, setResolvedPortal] = useState<SyncablePortalType>(portalTypeProp ?? DEFAULT_PORTAL)
  const [currentStep, setCurrentStep] = useState(0)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'running' | 'success' | 'partial' | 'failed'>('running')
  const [result, setResult] = useState<SyncResult | null>(null)
  const [stepDetails, setStepDetails] = useState<Record<string, SyncStepDetail>>({})
  const [registerTarget, setRegisterTarget] = useState<UnmatchedBeneficiary | null>(null)
  const finishedRef = useRef(false)
  const startedAtRef = useRef(0)
  const lastEventAtRef = useRef(0)
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const [longRunning, setLongRunning] = useState(false)

  const profile = useMemo(() => getSyncPortalProfile(resolvedPortal), [resolvedPortal])

  useEffect(() => {
    if (portalTypeProp) setResolvedPortal(portalTypeProp)
  }, [portalTypeProp])

  useEffect(() => {
    if (!jobId) return
    finishedRef.current = false
    startedAtRef.current = Date.now()
    lastEventAtRef.current = Date.now()
    setCurrentStep(0)
    setMessage(t('syncProgress.starting'))
    setStatus('running')
    setResult(null)
    setStepDetails({})
    setRegisterTarget(null)
    setLongRunning(false)
    if (portalTypeProp) setResolvedPortal(portalTypeProp)

    let cancelled = false

    const applyPayload = (p: SyncProgressStreamPayload) => {
      if (cancelled || finishedRef.current) return
      if (p.event !== 'heartbeat') {
        if (p.portalType) setResolvedPortal(p.portalType as SyncablePortalType)
        if (p.message) setMessage(p.message)
        if (p.stepDetails) setStepDetails(p.stepDetails)
      }

      const portal = (p.portalType as SyncablePortalType | undefined) ?? portalTypeProp ?? DEFAULT_PORTAL
      const details = p.stepDetails ?? {}
      if (p.event !== 'heartbeat') {
        setCurrentStep(resolveSyncStepIndex(p.step, portal, details))
      }

      if (isFatalJobFailure(p.step, p.status)) {
        if (finishedRef.current) return
        finishedRef.current = true
        setStatus('failed')
        setMessage(p.message || t('modals.syncError'))
        onErrorRef.current(p.message || t('modals.syncError'))
        return
      }

      if (isJobFinished(p as { step: string; status: string; result?: SyncResult })) {
        if (finishedRef.current) return
        finishedRef.current = true
        const activeProfile = getSyncPortalProfile(portal)
        const partial = ((p.result?.warnings?.length ?? 0) > 0)
          || fetchGroupHasFailure(details, activeProfile)
        setStatus(partial ? 'partial' : 'success')
        setCurrentStep(activeProfile.mainSteps.length - 1)
        if (p.result !== undefined) setResult(p.result as unknown as SyncResult)
        if (p.stepDetails) setStepDetails(p.stepDetails)
      }
    }

    const onStreamPayload = (p: SyncProgressStreamPayload) => {
      lastEventAtRef.current = Date.now()
      applyPayload(p)
    }

    const closeStream = openSyncJobStream(jobId, onStreamPayload, () => {
      if (!cancelled && !finishedRef.current) lastEventAtRef.current = 0
    })

    const reconcile = async () => {
      if (cancelled || finishedRef.current) return
      try {
        const p = await api.integrationLinks.syncProgress(jobId)
        if (cancelled || finishedRef.current) return
        lastEventAtRef.current = Date.now()
        applyPayload({ ...p, event: 'snapshot' })
      } catch {
        // reconciliação falhou
      }
    }

    void reconcile()

    const staleCheck = setInterval(() => {
      if (cancelled || finishedRef.current) return
      if (Date.now() - startedAtRef.current > LONG_RUNNING_HINT_MS) {
        setLongRunning(true)
      }
      const staleFor = Date.now() - lastEventAtRef.current
      if (lastEventAtRef.current > 0 && staleFor > SYNC_STREAM_STALE_MS) {
        void reconcile()
      }
    }, SYNC_FALLBACK_CHECK_MS)

    return () => {
      cancelled = true
      closeStream()
      clearInterval(staleCheck)
    }
  }, [jobId, portalTypeProp, t])

  const isOpen = !!jobId
  const canClose = true
  const warnings = result?.warnings ?? []
  const jobDone = status !== 'running'
  const loginDetail = stepDetails.login
  const loginMessage = loginDetail?.message || message
  const showFleuryOtpInApp = status === 'running'
    && jobId
    && resolvedPortal === 'hermes_pardini'
    && loginDetail?.status === 'running'
    && isFleuryOtpInAppMessage(loginMessage)
  const showFleuryOtpHint = status === 'running'
    && resolvedPortal === 'hermes_pardini'
    && loginDetail?.status === 'running'
    && !showFleuryOtpInApp
    && isFleuryOtpLoginMessage(loginMessage)
  const showInteractiveLoginHint = status === 'running'
    && loginDetail?.status === 'running'
    && !showFleuryOtpHint
    && !showFleuryOtpInApp
    && isInteractiveLoginMessage(loginMessage)

  const visibleFetchSubsteps = profile.fetchSubsteps.filter((s) => stepDetails[s.key])

  return (
    <>
      <Modal open={isOpen} footer={null} closable={canClose} onCancel={onDone} width={600} centered maskClosable={canClose}>
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          {status === 'running' && (
            <SyncOverallIcon status="running" />
          )}
          {status === 'success' && <SyncOverallIcon status="success" style={{ fontSize: 40 }} />}
          {status === 'partial' && <SyncOverallIcon status="partial" style={{ fontSize: 40 }} />}
          {status === 'failed' && <SyncOverallIcon status="failed" style={{ fontSize: 40 }} />}

          <Title level={4} style={{ marginTop: 16 }}>
            {status === 'running'
              ? t('syncProgress.syncingPortal', { portal: profile.label })
              : status === 'success'
                ? t('syncProgress.syncComplete')
                : status === 'partial'
                  ? t('syncProgress.syncPartial')
                  : t('syncProgress.syncFailed')}
          </Title>

          {showFleuryOtpInApp && jobId && (
            <div style={{ marginTop: 12, textAlign: 'left' }}>
              <FleuryOtpSyncInput jobId={jobId} />
            </div>
          )}

          {showFleuryOtpHint && (
            <div style={{ marginTop: 12, textAlign: 'left' }}>
              <FleuryOtpSyncHint />
            </div>
          )}

          {showInteractiveLoginHint && (
            <Alert
              type="info"
              showIcon
              style={{ marginTop: 12, textAlign: 'left' }}
              message={t('syncProgress.manualLoginRequired')}
              description={loginDetail?.message || message}
            />
          )}

          {longRunning && status === 'running' && (
            <Alert
              type="info"
              showIcon
              style={{ marginTop: 12, textAlign: 'left' }}
              message={t('syncProgress.syncInProgress')}
              description={t('syncProgress.syncInProgressDesc')}
            />
          )}

          <div style={{ marginTop: 16, textAlign: 'left' }}>
            <Steps
              direction="vertical"
              size="small"
              current={currentStep}
              items={profile.mainSteps.map((s, i) => ({
                title: s.title,
                status: mainStepStatus(status, currentStep, i, s.key),
                description: s.key === 'fetch' && visibleFetchSubsteps.length > 0 ? (
                  <List
                    size="small"
                    style={{ marginTop: 4 }}
                    dataSource={visibleFetchSubsteps}
                    renderItem={(sub) => {
                      const detail = stepDetails[sub.key]
                      if (!detail) return null
                      const subStatus = resolveSubstepStatus(sub, detail, jobDone, warnings)
                      return (
                        <List.Item style={{ padding: '2px 0', border: 'none' }}>
                          <Space size={4} wrap>
                            {subStatus === 'failed' ? (
                              <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 12 }} />
                            ) : subStatus === 'success' ? (
                              <CheckCircleFilled style={{ color: '#52c41a', fontSize: 12 }} />
                            ) : (
                              <LoadingOutlined spin style={{ fontSize: 12, color: '#1677ff' }} />
                            )}
                            <Text type={subStatus === 'failed' ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
                              {sub.label}: {detail.message.length > 120
                                ? `${detail.message.slice(0, 117)}…`
                                : detail.message}
                            </Text>
                          </Space>
                        </List.Item>
                      )
                    }}
                  />
                ) : s.key === 'login' && loginDetail && status === 'running' ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>{loginDetail.message}</Text>
                ) : undefined,
              }))}
            />
          </div>

          {message && !showInteractiveLoginHint && !showFleuryOtpHint && !showFleuryOtpInApp && status === 'failed' && message.length > 140 ? (
            <SyncDiagnosticMessage
              variant="error"
              title={t('modals.syncError')}
              message={message}
              collapsedMaxHeight={96}
            />
          ) : message && !showInteractiveLoginHint && !showFleuryOtpHint && !showFleuryOtpInApp ? (
            <Text
              type={status === 'failed' ? 'danger' : status === 'partial' ? 'warning' : 'secondary'}
              style={{ marginTop: 12, display: 'block' }}
            >
              {message}
            </Text>
          ) : null}

          {(status === 'success' || status === 'partial') && (
            <div style={{ marginTop: 20, textAlign: 'left', background: '#f5f5f5', borderRadius: 8, padding: 16 }}>
              <Text strong>{t('syncProgress.summaryTitle')}</Text>
              {result ? (
                <SyncSummary
                  profile={profile}
                  result={result}
                  warnings={warnings}
                  holderPatientId={holderPatientId}
                  onRegister={setRegisterTarget}
                />
              ) : (
                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                  {t('syncProgress.summaryMissing')}
                </Text>
              )}
            </div>
          )}

          {canClose && (
            <Space style={{ marginTop: 24 }}>
              <Button type="primary" onClick={onDone}>
                {status === 'running' ? t('syncProgress.closeContinueBackground') : t('common.close')}
              </Button>
            </Space>
          )}
        </div>
      </Modal>

      {profile.summary.showUnmatchedDependents && holderPatientId && (
        <RegisterAmilDependentModal
          open={!!registerTarget}
          beneficiary={registerTarget}
          holderPatientId={holderPatientId}
          onClose={() => setRegisterTarget(null)}
          onRegistered={() => {
            setRegisterTarget(null)
            onResync?.()
          }}
        />
      )}
    </>
  )
}
