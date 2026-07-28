import { useState } from 'react'
import { Table, Button, Select, Tag, Modal, Upload, App, Input, Space, Typography, Tooltip, Empty, Alert, Checkbox, Form, DatePicker, Popconfirm } from 'antd'
import { PlusOutlined, FileTextOutlined, InboxOutlined, EyeOutlined, CheckCircleOutlined, CloseCircleOutlined, IdcardOutlined, DeleteOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { api } from '../../../lib/api.js'
import { usePatientEntity } from '../../../hooks/use-patient-entity.js'
import type { Document_, SuggestedPatientFields } from '../../../lib/api.types.js'

interface Props {
  patientId: string
  onPatientUpdated?: () => void
}

const { Dragger } = Upload
const { Text } = Typography
const { TextArea } = Input

const CLINICAL_TYPES = ['prescription', 'exam', 'report', 'vaccine_card', 'other'] as const
const IDENTITY_TYPES = ['certidao_nascimento', 'rg', 'cpf_card', 'cnh'] as const

const typeColors: Record<string, string> = {
  prescription: 'blue',
  exam: 'cyan',
  report: 'geekblue',
  vaccine_card: 'green',
  other: 'default',
  certidao_nascimento: 'magenta',
  rg: 'purple',
  cpf_card: 'volcano',
  cnh: 'orange',
}

function isIdentityType(type: string) {
  return (IDENTITY_TYPES as readonly string[]).includes(type)
}

export function DocumentsTab({ patientId, onPatientUpdated }: Props) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { data, loading, reload } = usePatientEntity<Document_>(api.documents.list, patientId)
  const [open, setOpen] = useState(false)
  const [documentType, setDocumentType] = useState<string>('certidao_nascimento')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewDoc, setReviewDoc] = useState<Document_ | null>(null)
  const [reviewText, setReviewText] = useState('')
  const [suggested, setSuggested] = useState<SuggestedPatientFields>({})
  const [applyCpf, setApplyCpf] = useState(true)
  const [applyName, setApplyName] = useState(false)
  const [applyBirthDate, setApplyBirthDate] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const openReview = (doc: Document_, suggestion?: SuggestedPatientFields) => {
    setReviewDoc(doc)
    setReviewText(doc.extractedText || '')
    setSuggested(suggestion || {})
    setApplyCpf(!!suggestion?.cpf)
    setApplyName(false)
    setApplyBirthDate(false)
    setReviewOpen(true)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const doc = await api.documents.upload(patientId, documentType, file)
      openReview(doc, doc.suggestedPatient)
      setOpen(false)
      setFile(null)
      reload()
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Erro no upload')
    } finally {
      setUploading(false)
    }
  }

  const handleConfirmReview = async () => {
    if (!reviewDoc) return
    setConfirming(true)
    try {
      const identity = isIdentityType(reviewDoc.documentType)
      if (identity && (applyCpf || applyName || applyBirthDate)) {
        await api.documents.applyIdentity(reviewDoc.id, {
          applyCpf,
          applyName,
          applyBirthDate,
          cpf: suggested.cpf?.replace(/\D/g, ''),
          name: suggested.name,
          birthDate: suggested.birthDate,
          extractedText: reviewText,
        })
        message.success('Arquivo salvo e dados aplicados no paciente')
        onPatientUpdated?.()
      } else {
        if (reviewText !== (reviewDoc.extractedText || '')) {
          await api.documents.update(reviewDoc.id, { extractedText: reviewText })
        }
        message.success('Arquivo salvo com revisão')
      }
      setReviewOpen(false)
      setReviewDoc(null)
      reload()
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Erro ao salvar revisão')
    } finally {
      setConfirming(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.documents.delete(id)
      message.success('Arquivo excluído')
      reload()
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Erro ao excluir')
    }
  }

  const columns = [
    {
      title: t('document.type'), dataIndex: 'documentType', render: (v: string) => <Tag color={typeColors[v]}>{t(`documentType.${v}`)}</Tag>,
    },
    { title: t('document.fileName'), dataIndex: 'originalFilename', render: (v: string) => <><FileTextOutlined /> {v}</> },
    { title: t('document.size'), dataIndex: 'fileSizeBytes', render: (v: number | null) => v ? `${(v / 1024).toFixed(1)} KB` : '-' },
    {
      title: 'OCR', dataIndex: 'ocrProcessed', render: (v: boolean, r: Document_) => (
        <Tooltip title={r.extractedText ? r.extractedText.slice(0, 300) : 'Nenhum texto extraído'}>
          <Tag
            color={v ? 'green' : 'default'}
            style={{ cursor: 'pointer' }}
            onClick={() => openReview(r)}
          >
            {v ? <><EyeOutlined /> {t('document.processed')}</> : <><CloseCircleOutlined /> {t('document.pending')}</>}
          </Tag>
        </Tooltip>
      ),
    },
    { title: t('document.upload'), dataIndex: 'uploadedAt', render: (v: string) => new Date(v).toLocaleDateString() },
    {
      title: '',
      key: 'actions',
      width: 64,
      render: (_: unknown, r: Document_) => (
        <Popconfirm
          title="Excluir este arquivo?"
          description="A versão original será removida. Guarde uma cópia compactada se ainda precisar."
          okText="Excluir"
          cancelText="Cancelar"
          okButtonProps={{ danger: true }}
          onConfirm={() => handleDelete(r.id)}
        >
          <Button type="text" danger icon={<DeleteOutlined />} aria-label="Excluir arquivo" />
        </Popconfirm>
      ),
    },
  ]

  const identityMode = reviewDoc ? isIdentityType(reviewDoc.documentType) : isIdentityType(documentType)

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setDocumentType('certidao_nascimento'); setOpen(true) }}>
            {t('document.new')}
          </Button>
          <Text type="secondary">Use certidão/RG/CPF para popular o paciente via OCR</Text>
        </Space>
      </div>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={false} size="small" locale={{ emptyText: <Empty description="Nenhum arquivo" /> }} />

      <Modal
        title={t('document.new')}
        open={open}
        onOk={handleUpload}
        onCancel={() => { setOpen(false); setFile(null) }}
        confirmLoading={uploading}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>{t('document.type')}</div>
          <Select value={documentType} onChange={setDocumentType} style={{ width: '100%' }}
            options={[
              {
                label: 'Identificação',
                options: IDENTITY_TYPES.map((value) => ({ value, label: t(`documentType.${value}`) })),
              },
              {
                label: 'Clínicos',
                options: CLINICAL_TYPES.map((value) => ({ value, label: t(`documentType.${value}`) })),
              },
            ]}
          />
        </div>
        {isIdentityType(documentType) && (
          <Alert
            type="info"
            showIcon
            icon={<IdcardOutlined />}
            style={{ marginBottom: 16 }}
            message="Documento de identificação"
            description="Após o OCR, você poderá aplicar CPF (e opcionalmente nome/nascimento) no cadastro do paciente — útil para vincular na Unimed."
          />
        )}
        <Dragger
          accept="image/jpeg,image/png,image/gif,image/bmp,image/webp,application/pdf"
          beforeUpload={(f) => { setFile(f); return false }}
          onRemove={() => setFile(null)}
          fileList={file ? [{ uid: '-1', name: file.name, status: 'done' }] : []}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">{t('document.dropHint')}</p>
          <p className="ant-upload-hint">
            {['prescription', 'exam', 'report'].includes(documentType)
              ? 'Receitas/exames manuscritos: OCR local TrOCR (1ª vez pode demorar para baixar o modelo)'
              : 'Preferir foto/scan nítido (JPEG/PNG). Certidões: Tesseract local → Vision se preciso'}
          </p>
        </Dragger>
      </Modal>

      <Modal
        title={<><FileTextOutlined /> Revisão do OCR</>}
        open={reviewOpen}
        onOk={handleConfirmReview}
        onCancel={() => { setReviewOpen(false); setReviewDoc(null) }}
        confirmLoading={confirming}
        okText={identityMode ? 'Confirmar e aplicar no paciente' : 'Confirmar e salvar'}
        cancelText="Fechar"
        width={720}
      >
        {reviewDoc && (
          <div>
            <Space style={{ marginBottom: 16 }} wrap>
              <Tag color={typeColors[reviewDoc.documentType]}>{t(`documentType.${reviewDoc.documentType}`)}</Tag>
              <Text type="secondary">{reviewDoc.originalFilename}</Text>
              {reviewDoc.ocrProcessed
                ? <Tag icon={<CheckCircleOutlined />} color="success">OCR processado</Tag>
                : <Tag icon={<CloseCircleOutlined />} color="warning">OCR falhou / parcial</Tag>}
              {reviewDoc.ocrProvider && (
                <Tag color={reviewDoc.ocrUsedPaid ? 'orange' : 'blue'}>
                  {reviewDoc.ocrUsedPaid ? 'Fallback pago' : 'OCR local'}: {reviewDoc.ocrProvider}
                  {reviewDoc.ocrQualityScore != null ? ` · score ${reviewDoc.ocrQualityScore}` : ''}
                </Tag>
              )}
              {reviewDoc.ocrParseOk != null && (
                <Tag color={reviewDoc.ocrParseOk ? 'green' : 'red'}>
                  Parse {reviewDoc.ocrParseOk ? 'OK' : 'incompleto'}
                  {reviewDoc.ocrFieldsFound != null && reviewDoc.ocrFieldsExpected != null
                    ? ` (${reviewDoc.ocrFieldsFound}/${reviewDoc.ocrFieldsExpected})`
                    : ''}
                </Tag>
              )}
            </Space>

            {identityMode && (
              <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
                <Text strong>Dados detectados para o paciente</Text>
                <Form layout="vertical" style={{ marginTop: 12 }}>
                  <Form.Item label="CPF">
                    <Space>
                      <Checkbox checked={applyCpf} onChange={(e) => setApplyCpf(e.target.checked)} />
                      <Input
                        value={suggested.cpf || ''}
                        onChange={(e) => setSuggested((s) => ({ ...s, cpf: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                        placeholder="11 dígitos"
                        style={{ width: 180 }}
                      />
                    </Space>
                  </Form.Item>
                  <Form.Item label="Nome">
                    <Space align="start">
                      <Checkbox checked={applyName} onChange={(e) => setApplyName(e.target.checked)} />
                      <Input
                        value={suggested.name || ''}
                        onChange={(e) => setSuggested((s) => ({ ...s, name: e.target.value }))}
                        style={{ width: 360 }}
                      />
                    </Space>
                  </Form.Item>
                  <Form.Item label="Nascimento">
                    <Space>
                      <Checkbox checked={applyBirthDate} onChange={(e) => setApplyBirthDate(e.target.checked)} />
                      <DatePicker
                        value={suggested.birthDate ? dayjs(suggested.birthDate) : null}
                        onChange={(d) => setSuggested((s) => ({ ...s, birthDate: d ? d.format('YYYY-MM-DD') : undefined }))}
                        format="DD/MM/YYYY"
                      />
                    </Space>
                  </Form.Item>
                </Form>
                {!suggested.cpf && (
                  <Alert type="warning" showIcon message="CPF não detectado automaticamente — preencha manualmente se estiver no texto." />
                )}
              </div>
            )}

            <div style={{ marginBottom: 8 }}>
              <Text strong>Texto extraído:</Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>(edite se necessário)</Text>
            </div>
            <TextArea rows={10} value={reviewText} onChange={e => setReviewText(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 13 }} />
            {!reviewDoc.ocrProcessed && (
              <Alert type="warning" showIcon message="OCR automático falhou ou ficou incompleto. Revise o texto antes de confirmar." style={{ marginTop: 12 }} />
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
