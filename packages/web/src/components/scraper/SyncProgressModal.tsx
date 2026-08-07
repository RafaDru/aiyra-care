import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal, Steps, Typography, Spin, Button, Space, Descriptions, List, Tag, Alert } from 'antd'
import { LoadingOutlined, CheckCircleFilled, CloseCircleFilled, WarningFilled, UserAddOutlined } from '@ant-design/icons'
import { api } from '../../lib/api.js'
import {
  fetchGroupHasFailure,
  getSyncPortalProfile,
  isInteractiveLoginMessage,
  mainStepStatus,
  resolveSubstepStatus,
  resolveSyncStepIndex,
  type SyncablePortalType,
  type SyncPortalProfile,
} from '../../lib/sync-portal-profile.js'
import { RegisterAmilDependentModal, type UnmatchedBeneficiary } from './RegisterAmilDependentModal.js'

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

const POLL_MS = 800
const LONG_RUNNING_HINT_MS = 3 * 60 * 1000
const DEFAULT_PORTAL: SyncablePortalType = 'unimed'

/** Job concluído apenas quando o controller gravou o result (evita falso "Concluído" do scraper). */
function isJobFinished(p: { step: string; status: string; result?: SyncResult }) {
  return p.result !== undefined
}

function isFatalJobFailure(step: string, status: string): boolean {
  return status === 'failed' && step === 'error'
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
  const { summary } = profile
  const beneficiaries = result.beneficiaryDetails ?? []
  const unmatched = result.unmatchedBeneficiaries ?? []

  return (
    <>
      {summary.showWarnings && warnings.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginTop: 12, textAlign: 'left' }}
          message="Algumas etapas falharam"
          action={
            <Button
              size="small"
              type="link"
              onClick={() => void navigator.clipboard.writeText(warnings.join('\n'))}
            >
              Copiar
            </Button>
          }
          description={
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              {warnings.map((w) => <li key={w}><Text style={{ fontSize: 12 }}>{w}</Text></li>)}
            </ul>
          }
        />
      )}

      {summary.showBeneficiaries && beneficiaries.length > 0 && (
        <List
          size="small"
          header={<Text strong>Beneficiários do plano</Text>}
          style={{ marginTop: 12, background: '#fff', borderRadius: 6, padding: '0 8px' }}
          dataSource={beneficiaries}
          renderItem={(b) => (
            <List.Item>
              <Space wrap>
                <Tag color={b.role === 'holder' ? 'blue' : 'purple'}>
                  {b.role === 'holder' ? 'Titular' : 'Dependente'}
                </Tag>
                <Text strong>{formatBeneficiaryName(b.name)}</Text>
                <Text type="secondary">→ {b.patientName}</Text>
                <Tag color="green">{b.authorizationsImported} novas</Tag>
                {b.authorizationsUpdated > 0 && (
                  <Tag color="geekblue">{b.authorizationsUpdated} atualizadas</Tag>
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
            message="Dependentes no plano sem cadastro local"
            description="Cadastre para importar guias e carteirinha na próxima sincronização."
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
                    Cadastrar
                  </Button>,
                ] : undefined}
              >
                <Space wrap>
                  <Text strong>{formatBeneficiaryName(b.name)}</Text>
                  <Tag>{b.authorizationCount} guias no portal</Tag>
                  {b.cpf && <Text type="secondary">CPF {b.cpf}</Text>}
                </Space>
              </List.Item>
            )}
          />
        </div>
      )}

      <Descriptions column={1} size="small" style={{ marginTop: 12 }}>
      {summary.showExams && (
        <Descriptions.Item label="Exames novos">{result.exams}</Descriptions.Item>
      )}
      {result.novelty && (
        <>
          {result.novelty.portalExams != null && (
            <Descriptions.Item label="Exames no portal">{result.novelty.portalExams}</Descriptions.Item>
          )}
          {result.novelty.skippedExamRecords != null && (
            <Descriptions.Item label="Exames já conhecidos">{result.novelty.skippedExamRecords}</Descriptions.Item>
          )}
          {result.novelty.filesDownloaded != null && (
            <Descriptions.Item label="Arquivos baixados">{result.novelty.filesDownloaded}</Descriptions.Item>
          )}
          {result.novelty.filesSkipped != null && (
            <Descriptions.Item label="Arquivos já em cache">{result.novelty.filesSkipped}</Descriptions.Item>
          )}
        </>
      )}
        {summary.showMedicalRecords && (
          <Descriptions.Item label="Consultas novas">{result.medicalRecords}</Descriptions.Item>
        )}
        {summary.showAuthorizations && (
          <>
            <Descriptions.Item label="Autorizações novas">{result.authorizations}</Descriptions.Item>
            <Descriptions.Item label="Autorizações atualizadas">{result.updatedAuthorizations}</Descriptions.Item>
            <Descriptions.Item label="Itens/procedimentos">{result.authorizationItems}</Descriptions.Item>
          </>
        )}
        <Descriptions.Item label="Total alterado"><Text strong>{result.total}</Text></Descriptions.Item>
      </Descriptions>

      {summary.showAuthorizations && result.authorizationDetails?.length > 0 && (
        <List
          size="small"
          header={<Text strong>Pedidos sincronizados</Text>}
          style={{ marginTop: 12, background: '#fff', borderRadius: 6, padding: '0 8px', maxHeight: 200, overflow: 'auto' }}
          dataSource={result.authorizationDetails}
          renderItem={(d) => (
            <List.Item>
              <Space wrap>
                <Tag color={d.action === 'created' ? 'green' : 'blue'}>
                  {d.action === 'created' ? 'Novo' : 'Atualizado'}
                </Tag>
                <Text>{d.solicitationNumber ? `Pedido ${d.solicitationNumber}` : 'Sem número'}</Text>
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
        <Text type="warning" style={{ display: 'block', marginTop: 8 }}>Nenhuma alteração encontrada.</Text>
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
  const [resolvedPortal, setResolvedPortal] = useState<SyncablePortalType>(portalTypeProp ?? DEFAULT_PORTAL)
  const [currentStep, setCurrentStep] = useState(0)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'running' | 'success' | 'partial' | 'failed'>('running')
  const [result, setResult] = useState<SyncResult | null>(null)
  const [stepDetails, setStepDetails] = useState<Record<string, SyncStepDetail>>({})
  const [registerTarget, setRegisterTarget] = useState<UnmatchedBeneficiary | null>(null)
  const finishedRef = useRef(false)
  const startedAtRef = useRef(0)
  const [longRunning, setLongRunning] = useState(false)

  const profile = useMemo(() => getSyncPortalProfile(resolvedPortal), [resolvedPortal])

  useEffect(() => {
    if (portalTypeProp) setResolvedPortal(portalTypeProp)
  }, [portalTypeProp])

  useEffect(() => {
    if (!jobId) return
    finishedRef.current = false
    startedAtRef.current = Date.now()
    setCurrentStep(0)
    setMessage('Iniciando...')
    setStatus('running')
    setResult(null)
    setStepDetails({})
    setRegisterTarget(null)
    setLongRunning(false)
    if (portalTypeProp) setResolvedPortal(portalTypeProp)

    const interval = setInterval(async () => {
      if (Date.now() - startedAtRef.current > LONG_RUNNING_HINT_MS) {
        setLongRunning(true)
      }

      try {
        const p = await api.integrationLinks.syncProgress(jobId)
        if (p.portalType) setResolvedPortal(p.portalType as SyncablePortalType)
        if (p.message) setMessage(p.message)
        if (p.stepDetails) setStepDetails(p.stepDetails)

        const portal = (p.portalType as SyncablePortalType | undefined) ?? portalTypeProp ?? DEFAULT_PORTAL
        const idx = resolveSyncStepIndex(p.step, portal)
        if (idx >= 0) setCurrentStep(idx)

        if (isFatalJobFailure(p.step, p.status)) {
          if (finishedRef.current) return
          finishedRef.current = true
          setStatus('failed')
          setMessage(p.message || 'Erro na sincronização')
          clearInterval(interval)
          onError(p.message || 'Erro na sincronização')
          return
        }

        if (isJobFinished(p)) {
          if (finishedRef.current) return
          finishedRef.current = true
          const activeProfile = getSyncPortalProfile(portal)
          const details = p.stepDetails ?? {}
          const partial = (p.result?.warnings?.length ?? 0) > 0
            || fetchGroupHasFailure(details, activeProfile)
          setStatus(partial ? 'partial' : 'success')
          setCurrentStep(activeProfile.mainSteps.length - 1)
          if (p.result !== undefined) setResult(p.result as SyncResult)
          if (p.stepDetails) setStepDetails(p.stepDetails)
          clearInterval(interval)
        }
      } catch {
        // job ainda não disponível
      }
    }, POLL_MS)

    return () => clearInterval(interval)
  }, [jobId, onError, portalTypeProp])

  const isOpen = !!jobId
  const canClose = true
  const warnings = result?.warnings ?? []
  const jobDone = status !== 'running'
  const loginDetail = stepDetails.login
  const showInteractiveLoginHint = status === 'running'
    && loginDetail?.status === 'running'
    && isInteractiveLoginMessage(loginDetail.message || message)

  const visibleFetchSubsteps = profile.fetchSubsteps.filter((s) => stepDetails[s.key])

  return (
    <>
      <Modal open={isOpen} footer={null} closable={canClose} onCancel={onDone} width={600} centered maskClosable={canClose}>
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          {status === 'running' && (
            <Spin indicator={<LoadingOutlined style={{ fontSize: 40 }} spin />} />
          )}
          {status === 'success' && <CheckCircleFilled style={{ fontSize: 40, color: '#52c41a' }} />}
          {status === 'partial' && <WarningFilled style={{ fontSize: 40, color: '#faad14' }} />}
          {status === 'failed' && <CloseCircleFilled style={{ fontSize: 40, color: '#ff4d4f' }} />}

          <Title level={4} style={{ marginTop: 16 }}>
            {status === 'running'
              ? `Sincronizando ${profile.label}...`
              : status === 'success'
                ? 'Sincronização concluída'
                : status === 'partial'
                  ? 'Sincronização parcial'
                  : 'Erro na sincronização'}
          </Title>

          {showInteractiveLoginHint && (
            <Alert
              type="info"
              showIcon
              style={{ marginTop: 12, textAlign: 'left' }}
              message="Login manual necessário"
              description={loginDetail?.message || message}
            />
          )}

          {longRunning && status === 'running' && (
            <Alert
              type="info"
              showIcon
              style={{ marginTop: 12, textAlign: 'left' }}
              message="Sincronização em andamento"
              description="Pode levar vários minutos (laudos e imagens). Você pode fechar este diálogo — o status continua na aba Carteira."
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
                              {sub.label}: {detail.message}
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

          {message && !showInteractiveLoginHint && (
            <Text
              type={status === 'failed' ? 'danger' : status === 'partial' ? 'warning' : 'secondary'}
              style={{ marginTop: 12, display: 'block' }}
            >
              {message}
            </Text>
          )}

          {(status === 'success' || status === 'partial') && (
            <div style={{ marginTop: 20, textAlign: 'left', background: '#f5f5f5', borderRadius: 8, padding: 16 }}>
              <Text strong>Resumo da sincronização:</Text>
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
                  Concluído, mas o resumo não veio no progresso. Feche e recarregue a ficha se necessário.
                </Text>
              )}
            </div>
          )}

          {canClose && (
            <Space style={{ marginTop: 24 }}>
              <Button type="primary" onClick={onDone}>
                {status === 'running' ? 'Fechar (continua em segundo plano)' : 'Fechar'}
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
