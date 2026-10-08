import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Modal, Form, Input, App, Alert, Collapse, Tag, Table, Typography, Spin, List, Space,
} from 'antd'
import { CloudDownloadOutlined, ChromeOutlined, UserOutlined, TeamOutlined, LinkOutlined } from '@ant-design/icons'
import { api } from '../../lib/api.js'
import type {
  CadernetaFamilyImportPlan,
  CadernetaMatchReason,
  GovBrSessionView,
  Patient,
  ScraperResult,
} from '../../lib/api.types.js'
import { BrandTag } from '../brands/BrandLogo.js'
import { getIntegrationOption, type PublicHealthPortal } from './integration-catalog.js'

const { Text, Title } = Typography

const STATUS_COLOR: Record<string, string> = {
  applied: 'success',
  pending: 'default',
  overdue: 'error',
  unknown: 'warning',
}

function matchReasonLabel(t: (key: string) => string, reason: CadernetaMatchReason): string {
  const keys: Record<CadernetaMatchReason, string> = {
    cpf: 'publicHealth.matchCpf',
    cns: 'publicHealth.matchCns',
    birth_date_name: 'publicHealth.matchBirthDateName',
    name_only: 'publicHealth.matchNameOnly',
    unmatched: 'publicHealth.matchUnmatched',
  }
  return t(keys[reason])
}

interface Props {
  open: boolean
  portal: PublicHealthPortal | null
  patientId: string
  linkedChildrenCount?: number
  onClose: () => void
  onImported?: () => void
}

export function PublicHealthIntegrationModal({
  open,
  portal,
  patientId,
  linkedChildrenCount = 0,
  onClose,
  onImported,
}: Props) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ScraperResult | null>(null)
  const [plan, setPlan] = useState<CadernetaFamilyImportPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [govbrSession, setGovbrSession] = useState<GovBrSessionView | null>(null)

  const option = portal ? getIntegrationOption(portal) : undefined
  const isCaderneta = portal === 'caderneta'
  const govbrReady = govbrSession?.sessionReady ?? false
  const hasPreview = isCaderneta ? plan != null : result != null
  const canImport = isCaderneta
    ? plan != null && plan.matches.length > 0
    : result != null

  useEffect(() => {
    if (!open || !patientId || !portal) return
    api.patients.get(patientId).then((p) => {
      setPatient(p)
      if (portal === 'conectesus' && p.cpf) {
        form.setFieldsValue({
          cpf: p.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
        })
      }
    }).catch(() => setPatient(null))
    api.account.govbrSession()
      .then(setGovbrSession)
      .catch(() => setGovbrSession(null))
  }, [open, patientId, portal, form])

  const resetState = () => {
    form.resetFields()
    setResult(null)
    setPlan(null)
    setError(null)
    setLoading(false)
    setImporting(false)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleFetch = async () => {
    if (!portal) return
    try {
      if (portal === 'conectesus') {
        const values = await form.validateFields()
        setLoading(true)
        setError(null)
        setResult(null)
        const data = await api.scraper.conectesus({ cpf: values.cpf.replace(/\D/g, '') })
        setResult(data)
        const session = await api.account.govbrSession().catch(() => null)
        if (session) setGovbrSession(session)
        message.success(
          t('toast.importCountsFound', { vaccines: data.vaccines.length, exams: data.exams.length }),
        )
      } else {
        setLoading(true)
        setError(null)
        setResult(null)
        setPlan(null)
        const data = await api.scraper.caderneta()
        setResult(data)
        const session = await api.account.govbrSession().catch(() => null)
        if (session) setGovbrSession(session)
        const bundles = data.childBundles ?? []
        if (bundles.length === 0) {
          setError(t('publicHealth.noDependentsFound'))
          return
        }
        const familyPlan = await api.patients.cadernetaFamilyPlan(patientId, {
          childBundles: bundles,
          responsibleCpf: data.responsibleCpf,
        })
        setPlan(familyPlan)
        message.success(
          t('publicHealth.cadernetaFetchSuccess', {
            dependents: bundles.length,
            linked: familyPlan.matches.length,
          }),
        )
      }
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      setError(err instanceof Error ? err.message : t('toast.connectError'))
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!portal) return
    setImporting(true)
    try {
      if (isCaderneta && result?.childBundles?.length) {
        const r = await api.patients.importCadernetaFamily(patientId, {
          childBundles: result.childBundles,
          responsibleCpf: result.responsibleCpf,
        })
        const parts = [
          r.totals.importedVaccines
            ? t('publicHealth.importPartVaccines', { count: r.totals.importedVaccines })
            : null,
          r.totals.importedSchedule
            ? t('publicHealth.importPartSchedule', { count: r.totals.importedSchedule })
            : null,
          r.totals.importedMilestones
            ? t('publicHealth.importPartMilestones', { count: r.totals.importedMilestones })
            : null,
          r.totals.importedClinical
            ? t('publicHealth.importPartClinical', { count: r.totals.importedClinical })
            : null,
        ].filter(Boolean)
        const who = r.byPatient.map((p) => p.patientName).join(', ')
        message.success(
          parts.length
            ? t('publicHealth.importSummaryFor', { who, parts: parts.join(', ') })
            : t('publicHealth.importNothingNewFor', {
                who: who || t('publicHealth.noMatches'),
              }),
        )
      } else if (result) {
        const [existingVaccines, existingExams] = await Promise.all([
          api.vaccines.list(patientId),
          api.exams.list(patientId),
        ])
        let importedVaccines = 0
        let importedExams = 0
        for (const v of result.vaccines) {
          const exists = existingVaccines.some(
            (x) => x.vaccineName === v.vaccineName && x.applicationDate?.slice(0, 10) === v.applicationDate?.slice(0, 10),
          )
          if (exists) continue
          await api.vaccines.create({
            patientId,
            vaccineName: v.vaccineName,
            doseNumber: Number(v.dose?.replace(/\D/g, '')) || undefined,
            applicationDate: v.applicationDate,
            batchNumber: v.batch,
            appliedBy: v.appliedBy,
            clinic: v.clinic,
            source: 'conectesus',
          })
          importedVaccines++
        }
        for (const e of result.exams) {
          const exists = existingExams.some(
            (x) => x.examType === e.examType && x.examDate?.slice(0, 10) === e.examDate?.slice(0, 10),
          )
          if (exists) continue
          await api.exams.create({
            patientId,
            examType: e.examType,
            examDate: e.examDate,
            resultSummary: e.results,
            source: 'conectesus',
          })
          importedExams++
        }
        if (result.patientCpf || result.patientCns) {
          await api.patients.update(patientId, {
            cpf: result.patientCpf || undefined,
            cns: result.patientCns || undefined,
          })
        }
        const parts: string[] = []
        if (importedVaccines) parts.push(`${importedVaccines} vacinas`)
        if (importedExams) parts.push(`${importedExams} exames`)
        message.success(
          parts.length ? t('toast.importCountsDone', { parts: parts.join(' e ') }) : t('toast.importNothingNew'),
        )
      }
      onImported?.()
      handleClose()
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('toast.importDataError'))
    } finally {
      setImporting(false)
    }
  }

  const vaccineCols = [
    { title: t('publicHealth.vaccine'), dataIndex: 'vaccineName' },
    { title: t('publicHealth.dose'), dataIndex: 'dose' },
    { title: t('publicHealth.date'), dataIndex: 'applicationDate' },
    { title: t('publicHealth.nextDose'), dataIndex: 'nextDoseDate', render: (v?: string) => v || '—' },
  ]

  const examCols = [
    { title: t('publicHealth.exam'), dataIndex: 'examType' },
    { title: t('publicHealth.date'), dataIndex: 'examDate' },
    { title: t('publicHealth.description'), dataIndex: 'description', render: (v?: string) => v || '—' },
  ]

  const portalTitle = option?.title ?? 'SUS'
  const okText = hasPreview
    ? (isCaderneta ? t('publicHealth.importForLinkedChildren') : t('patient.importForProfile'))
    : (isCaderneta ? t('publicHealth.fetchCaderneta') : t('publicHealth.fetchConectesus'))

  return (
    <Modal
      title={
        <Space>
          <CloudDownloadOutlined />
          {portal && <BrandTag brand={option?.brand ?? portal}>{portalTitle}</BrandTag>}
          <span>{t('publicHealth.importData')}</span>
        </Space>
      }
      open={open && portal != null}
      onOk={hasPreview ? handleImport : loading ? undefined : handleFetch}
      onCancel={handleClose}
      confirmLoading={loading || importing}
      okText={okText}
      cancelText={t('publicHealth.close')}
      width={720}
      okButtonProps={{ disabled: hasPreview && !canImport }}
      destroyOnClose
    >
      {option && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 12 }}>
          {option.description}
        </Text>
      )}

      {patient && (
        <Alert
          type="info"
          showIcon
          icon={<UserOutlined />}
          style={{ marginBottom: 16 }}
          message={t('patient.profileLabel', { name: patient.name })}
          description={
            isCaderneta && linkedChildrenCount > 0
              ? t('publicHealth.cadernetaResponsibleHint', { count: linkedChildrenCount })
              : t('patient.importHint')
          }
        />
      )}

      {!loading && !hasPreview && (
        <>
          {portal === 'conectesus' && (
            <Form form={form} layout="vertical">
              <Form.Item
                name="cpf"
                label={t('patient.cpfFieldLabel')}
                rules={[
                  { required: true },
                  {
                    validator: (_, v) => v && v.replace(/\D/g, '').length === 11
                      ? Promise.resolve()
                      : Promise.reject(t('publicHealth.cpfElevenDigits')),
                  },
                ]}
              >
                <Input placeholder={t('form.cpfMask')} maxLength={14} />
              </Form.Item>
            </Form>
          )}
          <Alert
            type={govbrReady ? 'success' : 'info'}
            showIcon
            icon={govbrReady ? <CloudDownloadOutlined /> : <ChromeOutlined />}
            message={
              govbrReady
                ? t('publicHealth.govbrSessionActive')
                : isCaderneta
                  ? t('publicHealth.govbrSessionCadernetaFirst')
                  : t('publicHealth.govbrSessionConecteFirst')
            }
          />
        </>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16, fontSize: 15 }}>
            {govbrReady
              ? <><CloudDownloadOutlined /> {t('publicHealth.fetchingConecte')}</>
              : <><ChromeOutlined /> {t('publicHealth.browserWindowOpened')}</>}
          </p>
          {!govbrReady && (
            <p style={{ color: '#666' }}>
              {t('publicHealth.waitGovbrLogin')}
            </p>
          )}
        </div>
      )}

      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginTop: 16 }}
        />
      )}

      {isCaderneta && plan && (
        <div style={{ marginTop: 8 }}>
          <Text strong><LinkOutlined /> {t('publicHealth.matchesTitle')}</Text>
          <Table
            size="small"
            style={{ marginTop: 8 }}
            pagination={false}
            rowKey={(r) => r.patientId}
            dataSource={plan.matches}
            columns={[
              {
                title: t('publicHealth.cadernetaColumn'),
                render: (_, row) => (
                  <Space>
                    <Text strong>{row.bundle.member.name ?? t('publicHealth.noName')}</Text>
                    {row.bundle.member.birthDate && <Text type="secondary">{row.bundle.member.birthDate}</Text>}
                  </Space>
                ),
              },
              { title: t('patient.inAppProfileColumn'), dataIndex: 'patientName' },
              {
                title: t('publicHealth.matchCriteria'),
                dataIndex: 'matchReason',
                render: (v: CadernetaMatchReason) => <Tag>{matchReasonLabel(t, v)}</Tag>,
              },
              {
                title: t('publicHealth.vaccinesColumn'),
                render: (_, row) => row.bundle.vaccines.length,
              },
              {
                title: t('publicHealth.scheduleColumn'),
                render: (_, row) => row.bundle.vaccineSchedule?.length ?? 0,
              },
            ]}
          />
          {plan.unmatched.length > 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginTop: 12 }}
              message={t('publicHealth.unmatchedDependents', { count: plan.unmatched.length })}
              description={plan.unmatched.map((u) => u.reason).join(' · ')}
            />
          )}
        </div>
      )}

      {result && portal === 'conectesus' && (
        <div style={{ marginTop: 8 }}>
          <Title level={5}><UserOutlined /> {result.patientName}</Title>
          {result.patientCpf && (
            <Tag style={{ marginBottom: 8 }}>
              CPF: {result.patientCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
            </Tag>
          )}
          {result.patientCns && <Tag color="blue" style={{ marginBottom: 8 }}>CNS: {result.patientCns}</Tag>}
          <div style={{ marginBottom: 12 }}>
            <Tag color="blue">{t('publicHealth.vaccinesTag', { count: result.vaccines.length })}</Tag>
            <Tag color="cyan">{t('publicHealth.examsTag', { count: result.exams.length })}</Tag>
          </div>
          <Collapse
            defaultActiveKey={result.vaccines.length ? 'vaccines' : undefined}
            items={[
              {
                key: 'vaccines',
                label: <span>{t('publicHealth.vaccinesColumn')} <Tag color="blue">{result.vaccines.length}</Tag></span>,
                children: (
                  <Table
                    dataSource={result.vaccines}
                    columns={vaccineCols}
                    rowKey={(_, i) => String(i)}
                    pagination={false}
                    size="small"
                  />
                ),
              },
              {
                key: 'exams',
                label: <span>{t('publicHealth.exam')} <Tag color="cyan">{result.exams.length}</Tag></span>,
                children: (
                  <Table
                    dataSource={result.exams}
                    columns={examCols}
                    rowKey={(_, i) => String(i)}
                    pagination={false}
                    size="small"
                  />
                ),
              },
            ]}
          />
        </div>
      )}

      {result && isCaderneta && (
        <Collapse
          style={{ marginTop: 12 }}
          defaultActiveKey={[]}
          items={[
            {
              key: 'family',
              label: <><TeamOutlined /> {t('publicHealth.familySection', { count: result.familyMembers?.length ?? 0 })}</>,
              children: (
                <List
                  size="small"
                  dataSource={result.familyMembers ?? []}
                  renderItem={(m) => (
                    <List.Item>
                      <Space>
                        <Text strong>{m.name ?? t('publicHealth.noName')}</Text>
                        {m.birthDate && <Text type="secondary">{m.birthDate}</Text>}
                        {m.cpf && <Tag>{m.cpf}</Tag>}
                      </Space>
                    </List.Item>
                  )}
                />
              ),
            },
            {
              key: 'schedule',
              label: t('publicHealth.scheduleAll', { count: result.vaccineSchedule?.length ?? 0 }),
              children: (
                <Table
                  size="small"
                  pagination={{ pageSize: 8 }}
                  rowKey={(r) => r.externalKey ?? `${r.vaccineName}-${r.doseLabel}`}
                  dataSource={result.vaccineSchedule ?? []}
                  columns={[
                    { title: t('publicHealth.vaccine'), dataIndex: 'vaccineName' },
                    { title: t('publicHealth.dose'), dataIndex: 'doseLabel', render: (v: string) => v ?? '—' },
                    {
                      title: t('publicHealth.status'),
                      dataIndex: 'status',
                      render: (v: string) => <Tag color={STATUS_COLOR[v] ?? 'default'}>{v}</Tag>,
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      )}
    </Modal>
  )
}
