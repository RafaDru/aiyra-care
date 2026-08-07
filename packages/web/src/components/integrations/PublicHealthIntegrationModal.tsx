import { useEffect, useState } from 'react'
import {
  Modal, Form, Input, App, Alert, Collapse, Tag, Table, Typography, Spin, List, Space,
} from 'antd'
import { CloudDownloadOutlined, ChromeOutlined, UserOutlined, TeamOutlined, LinkOutlined } from '@ant-design/icons'
import { api } from '../../lib/api.js'
import type {
  CadernetaFamilyImportPlan,
  CadernetaMatchReason,
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

const MATCH_LABEL: Record<CadernetaMatchReason, string> = {
  cpf: 'CPF',
  cns: 'CNS',
  birth_date_name: 'Data + nome',
  name_only: 'Nome',
  unmatched: '—',
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
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ScraperResult | null>(null)
  const [plan, setPlan] = useState<CadernetaFamilyImportPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)

  const option = portal ? getIntegrationOption(portal) : undefined
  const isCaderneta = portal === 'caderneta'
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
        message.success(`${data.vaccines.length} vacinas, ${data.exams.length} exames encontrados`)
      } else {
        setLoading(true)
        setError(null)
        setResult(null)
        setPlan(null)
        const data = await api.scraper.caderneta()
        setResult(data)
        const bundles = data.childBundles ?? []
        if (bundles.length === 0) {
          setError('Nenhum dependente encontrado na Minha Família do gov.br.')
          return
        }
        const familyPlan = await api.patients.cadernetaFamilyPlan(patientId, {
          childBundles: bundles,
          responsibleCpf: data.responsibleCpf,
        })
        setPlan(familyPlan)
        message.success(
          `Caderneta: ${bundles.length} dependente(s), ${familyPlan.matches.length} vinculado(s) no app`,
        )
      }
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      setError(err instanceof Error ? err.message : 'Erro ao conectar')
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
          r.totals.importedVaccines ? `${r.totals.importedVaccines} vacinas` : null,
          r.totals.importedSchedule ? `${r.totals.importedSchedule} calendário` : null,
          r.totals.importedMilestones ? `${r.totals.importedMilestones} marcos` : null,
          r.totals.importedClinical ? `${r.totals.importedClinical} histórico` : null,
        ].filter(Boolean)
        const who = r.byPatient.map((p) => p.patientName).join(', ')
        message.success(
          parts.length
            ? `Importados para ${who}: ${parts.join(', ')}`
            : `Nenhum dado novo (${who || 'sem correspondências'})`,
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
        message.success(parts.length ? `Importados ${parts.join(' e ')}` : 'Nenhum dado novo para importar')
      }
      onImported?.()
      handleClose()
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Erro ao importar dados')
    } finally {
      setImporting(false)
    }
  }

  const vaccineCols = [
    { title: 'Vacina', dataIndex: 'vaccineName' },
    { title: 'Dose', dataIndex: 'dose' },
    { title: 'Data', dataIndex: 'applicationDate' },
    { title: 'Próx. Dose', dataIndex: 'nextDoseDate', render: (v?: string) => v || '—' },
  ]

  const examCols = [
    { title: 'Exame', dataIndex: 'examType' },
    { title: 'Data', dataIndex: 'examDate' },
    { title: 'Descrição', dataIndex: 'description', render: (v?: string) => v || '—' },
  ]

  const portalTitle = option?.title ?? 'SUS'
  const okText = hasPreview
    ? (isCaderneta ? 'Importar para filhos vinculados' : 'Importar para este paciente')
    : (isCaderneta ? 'Buscar na Caderneta' : 'Buscar no ConecteSUS')

  return (
    <Modal
      title={
        <Space>
          <CloudDownloadOutlined />
          {portal && <BrandTag brand={option?.brand ?? portal}>{portalTitle}</BrandTag>}
          <span>Importar dados</span>
        </Space>
      }
      open={open && portal != null}
      onOk={hasPreview ? handleImport : loading ? undefined : handleFetch}
      onCancel={handleClose}
      confirmLoading={loading || importing}
      okText={okText}
      cancelText="Fechar"
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
          message={`Paciente: ${patient.name}`}
          description={
            isCaderneta && linkedChildrenCount > 0
              ? `Login como responsável; os dados serão distribuídos entre ${linkedChildrenCount} filho(s) vinculado(s).`
              : 'Os dados serão importados neste cadastro.'
          }
        />
      )}

      {!loading && !hasPreview && (
        <>
          {portal === 'conectesus' && (
            <Form form={form} layout="vertical">
              <Form.Item
                name="cpf"
                label="CPF do paciente"
                rules={[
                  { required: true },
                  {
                    validator: (_, v) => v && v.replace(/\D/g, '').length === 11
                      ? Promise.resolve()
                      : Promise.reject('CPF deve ter 11 dígitos'),
                  },
                ]}
              >
                <Input placeholder="000.000.000-00" maxLength={14} />
              </Form.Item>
            </Form>
          )}
          <Alert
            type="info"
            showIcon
            icon={<ChromeOutlined />}
            message={
              isCaderneta
                ? <>Uma janela do navegador será aberta para login no <strong>gov.br</strong> como responsável. Não é necessário senha neste app — use a conta do pai/mãe na Minha Família.</>
                : <>Uma janela do navegador será aberta para login no <strong>gov.br</strong>. Apenas o CPF é necessário aqui — a senha é solicitada pelo próprio gov.br.</>
            }
          />
        </>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16, fontSize: 15 }}>
            <ChromeOutlined /> Uma janela do navegador foi aberta.
          </p>
          <p style={{ color: '#666' }}>
            Faça o login no <strong>gov.br</strong> na janela e aguarde...
          </p>
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
          <Text strong><LinkOutlined /> Correspondências</Text>
          <Table
            size="small"
            style={{ marginTop: 8 }}
            pagination={false}
            rowKey={(r) => r.patientId}
            dataSource={plan.matches}
            columns={[
              {
                title: 'Caderneta',
                render: (_, row) => (
                  <Space>
                    <Text strong>{row.bundle.member.name ?? 'Sem nome'}</Text>
                    {row.bundle.member.birthDate && <Text type="secondary">{row.bundle.member.birthDate}</Text>}
                  </Space>
                ),
              },
              { title: 'Paciente no app', dataIndex: 'patientName' },
              {
                title: 'Critério',
                dataIndex: 'matchReason',
                render: (v: CadernetaMatchReason) => <Tag>{MATCH_LABEL[v]}</Tag>,
              },
              {
                title: 'Vacinas',
                render: (_, row) => row.bundle.vaccines.length,
              },
              {
                title: 'Calendário',
                render: (_, row) => row.bundle.vaccineSchedule?.length ?? 0,
              },
            ]}
          />
          {plan.unmatched.length > 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginTop: 12 }}
              message={`${plan.unmatched.length} dependente(s) sem correspondência`}
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
            <Tag color="blue">{result.vaccines.length} vacinas</Tag>
            <Tag color="cyan">{result.exams.length} exames</Tag>
          </div>
          <Collapse
            defaultActiveKey={result.vaccines.length ? 'vaccines' : undefined}
            items={[
              {
                key: 'vaccines',
                label: <span>Vacinas <Tag color="blue">{result.vaccines.length}</Tag></span>,
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
                label: <span>Exames <Tag color="cyan">{result.exams.length}</Tag></span>,
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
              label: <><TeamOutlined /> Minha Família ({result.familyMembers?.length ?? 0})</>,
              children: (
                <List
                  size="small"
                  dataSource={result.familyMembers ?? []}
                  renderItem={(m) => (
                    <List.Item>
                      <Space>
                        <Text strong>{m.name ?? 'Sem nome'}</Text>
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
              label: `Calendário vacinal (todos) (${result.vaccineSchedule?.length ?? 0})`,
              children: (
                <Table
                  size="small"
                  pagination={{ pageSize: 8 }}
                  rowKey={(r) => r.externalKey ?? `${r.vaccineName}-${r.doseLabel}`}
                  dataSource={result.vaccineSchedule ?? []}
                  columns={[
                    { title: 'Vacina', dataIndex: 'vaccineName' },
                    { title: 'Dose', dataIndex: 'doseLabel', render: (v: string) => v ?? '—' },
                    {
                      title: 'Status',
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
