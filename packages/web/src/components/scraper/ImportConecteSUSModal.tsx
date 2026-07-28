import { useEffect, useState } from 'react'
import { Modal, Form, Input, App, Alert, Collapse, Tag, Table, Typography, Spin } from 'antd'
import { CloudDownloadOutlined, ChromeOutlined, UserOutlined } from '@ant-design/icons'
import { api } from '../../lib/api.js'
import type { Patient, ScraperResult } from '../../lib/api.types.js'

interface Props {
  open: boolean
  onClose: () => void
  /** Integrations are always scoped to a patient. */
  patientId: string
  onImported?: () => void
}

export function ImportConecteSUSModal({ open, onClose, patientId, onImported }: Props) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ScraperResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)

  useEffect(() => {
    if (!open || !patientId) return
    api.patients.get(patientId).then((p) => {
      setPatient(p)
      form.setFieldsValue({
        cpf: p.cpf ? p.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '',
      })
    }).catch(() => setPatient(null))
  }, [open, patientId, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      setError(null)
      setResult(null)
      const data = await api.scraper.conectesus({ cpf: values.cpf.replace(/\D/g, '') })
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
    { title: 'Próx. Dose', dataIndex: 'nextDoseDate', render: (v?: string) => v || '-' },
  ]

  const examCols = [
    { title: 'Exame', dataIndex: 'examType' },
    { title: 'Data', dataIndex: 'examDate' },
    { title: 'Descrição', dataIndex: 'description', render: (v?: string) => v || '-' },
  ]

  return (
    <Modal
      title={<><CloudDownloadOutlined /> Importar do ConecteSUS</>}
      open={open}
      onOk={result ? handleImportData : loading ? undefined : handleOk}
      onCancel={handleClose}
      confirmLoading={loading || importing}
      okText={result ? 'Importar para este paciente' : 'Buscar no ConecteSUS'}
      cancelText="Fechar"
      width={720}
      okButtonProps={{ disabled: !patientId }}
    >
      {patient && (
        <Alert
          type="info"
          showIcon
          icon={<UserOutlined />}
          style={{ marginBottom: 16 }}
          message={`Paciente: ${patient.name}`}
          description="Os dados serão importados neste cadastro."
        />
      )}

      {!loading && !result && (
        <Form form={form} layout="vertical">
          <Form.Item name="cpf" label="CPF do paciente" rules={[
            { required: true },
            { validator: (_, v) => v && v.replace(/\D/g, '').length === 11 ? Promise.resolve() : Promise.reject('CPF deve ter 11 dígitos') },
          ]}>
            <Input placeholder="000.000.000-00" maxLength={14} />
          </Form.Item>
          <Alert type="info" showIcon icon={<ChromeOutlined />} message={
            <>Uma janela do navegador será aberta para login no <strong>gov.br</strong>. Apenas o CPF é necessário — a senha é solicitada pelo próprio gov.br.</>
          } />
        </Form>
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
        <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} style={{ marginTop: 16 }} />
      )}

      {result && (
        <div style={{ marginTop: 8 }}>
          <Typography.Title level={5}><UserOutlined /> {result.patientName}</Typography.Title>
          {result.patientCpf && <Tag style={{ marginBottom: 8 }}>CPF: {result.patientCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</Tag>}
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
                children: <Table dataSource={result.vaccines} columns={vaccineCols} rowKey={(_, i) => String(i)} pagination={false} size="small" />,
              },
              {
                key: 'exams',
                label: <span>Exames <Tag color="cyan">{result.exams.length}</Tag></span>,
                children: <Table dataSource={result.exams} columns={examCols} rowKey={(_, i) => String(i)} pagination={false} size="small" />,
              },
            ]}
          />
        </div>
      )}
    </Modal>
  )
}
