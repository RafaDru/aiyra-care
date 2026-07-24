import { useEffect, useState } from 'react'
import { Modal, Form, Input, App, Alert, Collapse, Tag, Table, Typography, Spin, Divider, Radio, Space } from 'antd'
import { CloudDownloadOutlined, ChromeOutlined, UserOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import type { Patient, ScraperResult } from '../../lib/api.types.js'

interface Props {
  open: boolean
  onClose: () => void
  patientId: string
}

export function ImportConecteSUSModal({ open, onClose, patientId }: Props) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScraperResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [localPatients, setLocalPatients] = useState<Patient[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)

  useEffect(() => {
    if (!result) return
    api.patients.list().then((list) => {
      let matches: Patient[] = []

      if (result.patientCpf) {
        matches = list.filter(p => p.cpf === result.patientCpf)
      }

      if (matches.length === 0 && result.patientName) {
        const name = result.patientName.toLowerCase().trim()
        matches = list.filter(p => p.name.toLowerCase().includes(name) || name.includes(p.name.toLowerCase()))
      }

      setLocalPatients(matches)
      if (matches.length === 1) setSelectedPatientId(matches[0].id)
    }).catch(() => {})
  }, [result])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      setError(null)
      setResult(null)
      setLocalPatients([])
      setSelectedPatientId(null)
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
    if (!selectedPatientId || !result) return
    try {
      for (const v of result.vaccines) {
        await api.vaccines.create({
          patientId: selectedPatientId,
          vaccineName: v.vaccineName,
          doseNumber: Number(v.dose?.replace(/\D/g, '')) || undefined,
          applicationDate: v.applicationDate,
          batchNumber: v.batch,
          appliedBy: v.appliedBy,
          clinic: v.clinic,
        })
      }
      for (const e of result.exams) {
        await api.exams.create({
          patientId: selectedPatientId,
          examType: e.examType,
          examDate: e.examDate,
          resultSummary: e.results,
        })
      }

      if (result.patientCpf || result.patientCns) {
        await api.patients.update(selectedPatientId, {
          cpf: result.patientCpf || undefined,
          cns: result.patientCns || undefined,
        })
      }

      message.success(`Importados ${result.vaccines.length} vacinas e ${result.exams.length} exames`)
      handleClose()
      navigate(`/patients/${selectedPatientId}`)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Erro ao importar dados')
    }
  }

  const handleCreatePatient = async () => {
    if (!result?.patientName) return
    try {
      const created = await api.patients.create({
        name: result.patientName,
        birthDate: result.patientBirthDate || new Date().toISOString(),
        cpf: result.patientCpf || undefined,
        cns: result.patientCns || undefined,
      })
      message.success('Paciente criado')
      setSelectedPatientId(created.id)
      handleClose()
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Erro ao criar paciente')
    }
  }

  const handleClose = () => {
    form.resetFields()
    setResult(null)
    setError(null)
    setLocalPatients([])
    setSelectedPatientId(null)
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
      onOk={loading || result ? undefined : handleOk}
      onCancel={handleClose}
      confirmLoading={loading}
      okText="Importar"
      cancelText="Fechar"
      width={720}
      footer={result ? (_, { CancelBtn }) => <CancelBtn /> : undefined}
    >
      {!loading && !result && (
        <Form form={form} layout="vertical">
          <Form.Item name="cpf" label="CPF do paciente" rules={[{ required: true, min: 11 }]}>
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
          <p style={{ color: '#999', fontSize: 12 }}>
            O scraper continuará automaticamente após o login
          </p>
        </div>
      )}

      {error && (
        <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} style={{ marginTop: 16 }} />
      )}

      {result && (
        <div style={{ marginTop: 16 }}>
          <Typography.Title level={5}><UserOutlined /> {result.patientName}</Typography.Title>
          {result.patientCpf && <Tag style={{ marginBottom: 8 }}>CPF: {result.patientCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</Tag>}
          {result.patientCns && <Tag color="blue" style={{ marginBottom: 8 }}>CNS: {result.patientCns}</Tag>}

          {localPatients.length > 0 ? (
            <>
              <Alert type="success" showIcon message={
                localPatients.some(p => p.cpf === result.patientCpf)
                  ? 'Paciente encontrado pelo CPF!'
                  : `Paciente encontrado pelo nome: ${localPatients.map(p => p.name).join(', ')}`
              } style={{ marginBottom: 12 }} />
              <Radio.Group value={selectedPatientId} onChange={e => setSelectedPatientId(e.target.value)} style={{ marginBottom: 12 }}>
                <Space direction="vertical">
                  {localPatients.map(p => (
                    <Radio key={p.id} value={p.id}>
                      {p.name} {p.cpf ? `(${p.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')})` : ''} — <Tag>já cadastrado</Tag>
                    </Radio>
                  ))}
                  <Radio value="__new">Criar novo paciente</Radio>
                </Space>
              </Radio.Group>
              <Divider />
              <Typography.Text strong>Importar dados para o paciente selecionado:</Typography.Text>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <Tag color="blue">{result.vaccines.length} vacinas</Tag>
                <Tag color="cyan">{result.exams.length} exames</Tag>
              </div>
              <div style={{ marginTop: 12 }}>
                <Space>
                  {selectedPatientId && selectedPatientId !== '__new' && (
                    <Typography.Link onClick={handleImportData}>
                      <CloudDownloadOutlined /> Importar para este paciente
                    </Typography.Link>
                  )}
                  {selectedPatientId === '__new' && (
                    <Typography.Link onClick={handleCreatePatient}>
                      <UserOutlined /> Criar e importar
                    </Typography.Link>
                  )}
                </Space>
              </div>
            </>
          ) : (
            <Alert type="warning" showIcon message={
              <>Paciente não encontrado no sistema. Deseja <Typography.Link onClick={handleCreatePatient}>criar novo paciente</Typography.Link>?</>
            } style={{ marginBottom: 12 }} />
          )}

          <Collapse
            defaultActiveKey={result.vaccines.length ? 'vaccines' : undefined}
            style={{ marginTop: 12 }}
            items={[
              { key: 'vaccines', label: <span>Vacinas <Tag color="blue">{result.vaccines.length}</Tag></span>,
                children: <Table dataSource={result.vaccines} columns={vaccineCols} rowKey={(_, i) => String(i)} pagination={false} size="small" /> },
              { key: 'exams', label: <span>Exames <Tag color="cyan">{result.exams.length}</Tag></span>,
                children: <Table dataSource={result.exams} columns={examCols} rowKey={(_, i) => String(i)} pagination={false} size="small" /> },
            ]}
          />
        </div>
      )}
    </Modal>
  )
}
