import { useEffect, useState } from 'react'
import { Modal, Form, Input, App, Alert, Collapse, Tag, Table, Typography, Spin } from 'antd'
import { CloudDownloadOutlined, ChromeOutlined, UserOutlined, KeyOutlined } from '@ant-design/icons'
import { api } from '../../lib/api.js'
import { DismissibleHint } from '../ui/DismissibleHint.js'
import type { Patient, ScraperResult } from '../../lib/api.types.js'

interface Props {
  open: boolean
  onClose: () => void
  portal: 'unimed' | 'amil' | 'bradesco_saude'
  label: string
  patientId: string
  usesEmail?: boolean
  onImported?: () => void
}

const portalApiMap = {
  unimed: api.scraper.unimed,
  amil: api.scraper.amil,
  bradesco_saude: api.scraper.bradesco,
}

export function ImportInsuranceModal({
  open, onClose, portal, label, patientId, usesEmail = false, onImported,
}: Props) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ScraperResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)

  useEffect(() => {
    if (!open || !patientId) return
    Promise.all([
      api.patients.get(patientId),
      api.planMemberships.list(patientId).catch(() => []),
    ]).then(([p, memberships]) => {
      setPatient(p)
      const defaults: { cpf?: string; membership?: string } = {}
      if (!usesEmail && p.cpf) {
        defaults.cpf = p.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
      }
      const match = memberships.find((m) => m.plan?.operator === portal || m.source === portal)
      if (match?.memberNumber) defaults.membership = match.memberNumber
      if (defaults.cpf || defaults.membership) form.setFieldsValue(defaults)
    }).catch(() => setPatient(null))
  }, [open, patientId, usesEmail, portal, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      setError(null)
      setResult(null)
      const scraperFn = portalApiMap[portal]
      const payload: Record<string, string | undefined> = {
        password: values.password,
        insuranceMembershipNumber: values.membership?.replace(/\D/g, '') || undefined,
      }
      if (usesEmail) payload.email = values.email
      else payload.cpf = values.cpf.replace(/\D/g, '')
      const data = await (scraperFn as (p: unknown) => Promise<ScraperResult>)(payload)
      setResult(data)
      message.success(`${data.vaccines.length} vacinas, ${data.exams.length} exames encontrados`)
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      setError(err instanceof Error ? err.message : 'Erro ao conectar')
    } finally {
      setLoading(false)
    }
  }

  const handleImportData = async () => {
    if (!result || !patientId) return
    setImporting(true)
    try {
      const [existingVaccines, existingExams] = await Promise.all([
        api.vaccines.list(patientId),
        api.exams.list(patientId),
      ])
      let importedVaccines = 0
      let importedExams = 0
      for (const v of result.vaccines) {
        if (existingVaccines.some((x) => x.vaccineName === v.vaccineName && x.applicationDate?.slice(0, 10) === v.applicationDate?.slice(0, 10))) continue
        await api.vaccines.create({
          patientId,
          vaccineName: v.vaccineName,
          doseNumber: Number(v.dose?.replace(/\D/g, '')) || undefined,
          applicationDate: v.applicationDate,
          batchNumber: v.batch,
          appliedBy: v.appliedBy,
          clinic: v.clinic,
          source: portal,
        })
        importedVaccines++
      }
      for (const e of result.exams) {
        if (existingExams.some((x) => x.examType === e.examType && x.examDate?.slice(0, 10) === e.examDate?.slice(0, 10))) continue
        await api.exams.create({
          patientId,
          examType: e.examType,
          examDate: e.examDate,
          resultSummary: e.results,
          source: portal,
        })
        importedExams++
      }
      const parts: string[] = []
      if (importedVaccines) parts.push(`${importedVaccines} vacinas`)
      if (importedExams) parts.push(`${importedExams} exames`)
      message.success(parts.length ? `Importados ${parts.join(' e ')}` : 'Nenhum dado novo para importar')
      onImported?.()
      handleClose()
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Erro ao importar dados')
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    form.resetFields()
    setResult(null)
    setError(null)
    onClose()
  }

  const vaccineCols = [
    { title: 'Vacina', dataIndex: 'vaccineName' },
    { title: 'Dose', dataIndex: 'dose' },
    { title: 'Data', dataIndex: 'applicationDate' },
  ]
  const examCols = [
    { title: 'Exame', dataIndex: 'examType' },
    { title: 'Data', dataIndex: 'examDate' },
  ]

  return (
    <Modal
      title={<><CloudDownloadOutlined /> Importar do {label}</>}
      open={open}
      onOk={result ? handleImportData : loading ? undefined : handleOk}
      onCancel={handleClose}
      confirmLoading={loading || importing}
      okText={result ? 'Importar para este paciente' : 'Buscar no portal'}
      cancelText="Fechar"
      width={720}
      okButtonProps={{ disabled: !patientId }}
    >
      {patient && (
        <DismissibleHint
          hintId="import-insurance.patient-target"
          type="info"
          showIcon
          icon={<UserOutlined />}
          style={{ marginBottom: 16 }}
          message={`Paciente: ${patient.name}`}
          description="Os dados serão importados neste cadastro. Para sync recorrente, vincule o portal no perfil do paciente."
        />
      )}

      {!loading && !result && (
        <Form form={form} layout="vertical">
          {usesEmail ? (
            <Form.Item name="email" label="E-mail de acesso" rules={[{ required: true, type: 'email' }]}>
              <Input placeholder="seu@email.com" />
            </Form.Item>
          ) : (
            <Form.Item name="cpf" label="CPF do titular" rules={[
              { required: true },
              { validator: (_, v) => v && v.replace(/\D/g, '').length === 11 ? Promise.resolve() : Promise.reject('CPF deve ter 11 dígitos') },
            ]}>
              <Input placeholder="000.000.000-00" maxLength={14} />
            </Form.Item>
          )}
          <Form.Item name="password" label="Senha do portal" rules={[{ required: true }]}>
            <Input.Password prefix={<KeyOutlined />} placeholder="Senha de acesso" />
          </Form.Item>
          <Form.Item name="membership" label="Número de matrícula (opcional)">
            <Input placeholder="Carteirinha / matrícula" />
          </Form.Item>
          <DismissibleHint
            hintId="import-insurance.browser-login"
            type="info"
            showIcon
            icon={<ChromeOutlined />}
            message={<>Uma janela do navegador será aberta para login no <strong>{label}</strong>.</>}
          />
        </Form>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>Acessando o <strong>{label}</strong>...</p>
        </div>
      )}

      {error && (
        <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} style={{ marginTop: 16 }} />
      )}

      {result && (
        <div>
          <Typography.Title level={5}>{result.patientName || 'Resultado'}</Typography.Title>
          <Tag color="blue">{result.vaccines.length} vacinas</Tag>
          <Tag color="cyan">{result.exams.length} exames</Tag>
          <Collapse
            style={{ marginTop: 12 }}
            items={[
              {
                key: 'vaccines',
                label: `Vacinas (${result.vaccines.length})`,
                children: <Table dataSource={result.vaccines} columns={vaccineCols} rowKey={(_, i) => String(i)} pagination={false} size="small" />,
              },
              {
                key: 'exams',
                label: `Exames (${result.exams.length})`,
                children: <Table dataSource={result.exams} columns={examCols} rowKey={(_, i) => String(i)} pagination={false} size="small" />,
              },
            ]}
          />
        </div>
      )}
    </Modal>
  )
}
