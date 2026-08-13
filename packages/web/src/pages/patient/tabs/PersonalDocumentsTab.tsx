import { useMemo, useState } from 'react'
import {
  Alert, App, Button, Card, Col, Checkbox, Form, Input, Modal, Popconfirm, Row, Space, Tag, Typography, Upload,
} from 'antd'
import { MaskedDatePicker } from '../../../components/ui/MaskedDatePicker.js'
import { DismissibleHint } from '../../../components/ui/DismissibleHint.js'
import dayjs from 'dayjs'
import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileProtectOutlined,
  IdcardOutlined,
  InboxOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api, documentDownloadUrl } from '../../../lib/api.js'
import { usePatientEntity } from '../../../hooks/use-patient-entity.js'
import type { Document_, SuggestedPatientFields } from '../../../lib/api.types.js'
import { DocumentUploadProgressModal } from '../../../components/document/DocumentUploadProgressModal.js'
import { OcrRegionReviewModal } from '../../../components/document/OcrRegionReviewModal.js'
import { uploadDocumentWithProgress, type DocumentUploadPhase } from '../../../lib/document-upload.js'
import { canUseOcrRegionReview } from '../../../lib/ocr-layout.js'

const { Text, Paragraph } = Typography
const { Dragger } = Upload

interface Props {
  patientId: string
}

const PERSONAL_DOC_SLOTS = [
  {
    type: 'certidao_nascimento',
    icon: <FileProtectOutlined style={{ fontSize: 28, color: '#eb2f96' }} />,
    hint: 'Certidão de nascimento ou registro civil — útil em internações pediátricas.',
  },
  {
    type: 'rg',
    icon: <IdcardOutlined style={{ fontSize: 28, color: '#722ed1' }} />,
    hint: 'Documento de identidade com foto (RG ou equivalente).',
  },
  {
    type: 'cpf_card',
    icon: <IdcardOutlined style={{ fontSize: 28, color: '#fa541c' }} />,
    hint: 'Cartão CPF ou comprovante de inscrição.',
  },
  {
    type: 'cnh',
    icon: <IdcardOutlined style={{ fontSize: 28, color: '#fa8c16' }} />,
    hint: 'Carteira de motorista (quando aplicável).',
  },
] as const

type PersonalDocType = typeof PERSONAL_DOC_SLOTS[number]['type']

function isPersonalType(type: string): type is PersonalDocType {
  return PERSONAL_DOC_SLOTS.some((s) => s.type === type)
}

export function PersonalDocumentsTab({ patientId }: Props) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { data, loading, reload } = usePatientEntity<Document_>(api.documents.list, patientId)

  const [uploadType, setUploadType] = useState<PersonalDocType | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgressOpen, setUploadProgressOpen] = useState(false)
  const [uploadPhase, setUploadPhase] = useState<DocumentUploadPhase>('upload')
  const [uploadPercent, setUploadPercent] = useState(0)
  const [uploadMessage, setUploadMessage] = useState<string | undefined>()
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [pendingUploadDoc, setPendingUploadDoc] = useState<Document_ | null>(null)
  const [pendingUploadType, setPendingUploadType] = useState<PersonalDocType | ''>('')
  const [uploadFileName, setUploadFileName] = useState<string | undefined>()
  const [visualReviewDoc, setVisualReviewDoc] = useState<Document_ | null>(null)
  const [identityReviewOpen, setIdentityReviewOpen] = useState(false)
  const [identityDoc, setIdentityDoc] = useState<Document_ | null>(null)
  const [suggested, setSuggested] = useState<SuggestedPatientFields>({})
  const [applyCpf, setApplyCpf] = useState(true)
  const [applyName, setApplyName] = useState(false)
  const [applyBirthDate, setApplyBirthDate] = useState(false)
  const [confirmingIdentity, setConfirmingIdentity] = useState(false)

  const personalDocs = useMemo(
    () => data.filter((d) => isPersonalType(d.documentType)),
    [data],
  )

  const docsByType = useMemo(() => {
    const map = new Map<PersonalDocType, Document_[]>()
    for (const slot of PERSONAL_DOC_SLOTS) map.set(slot.type, [])
    for (const doc of personalDocs) {
      if (!isPersonalType(doc.documentType)) continue
      map.get(doc.documentType)?.push(doc)
    }
    for (const [, list] of map) {
      list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    }
    return map
  }, [personalDocs])

  const attachedCount = personalDocs.length

  const openIdentityReview = (doc: Document_, suggestion?: SuggestedPatientFields) => {
    setIdentityDoc(doc)
    setSuggested(suggestion || doc.suggestedPatient || {})
    setApplyCpf(!!(suggestion?.cpf || doc.suggestedPatient?.cpf))
    setApplyName(false)
    setApplyBirthDate(false)
    setIdentityReviewOpen(true)
  }

  const finishPersonalUploadFlow = (doc: Document_) => {
    if (canUseOcrRegionReview(doc.mimeType, doc.ocrLayout)) {
      setVisualReviewDoc(doc)
      return
    }
    openIdentityReview(doc, doc.suggestedPatient)
  }

  const handleUpload = async () => {
    if (!uploadType || !file) return
    const selectedType = uploadType
    const selectedFile = file
    setUploadType(null)
    setFile(null)
    setUploadProgressOpen(true)
    setUploadPhase('upload')
    setUploadPercent(0)
    setUploadMessage(undefined)
    setUploadError(null)
    setPendingUploadDoc(null)
    setPendingUploadType(selectedType)
    setUploadFileName(selectedFile.name)
    setUploading(true)
    try {
      const doc = await uploadDocumentWithProgress(patientId, selectedType, selectedFile, (p) => {
        setUploadPhase(p.phase)
        setUploadPercent(p.uploadPercent ?? 0)
        setUploadMessage(p.message)
      })
      setPendingUploadDoc(doc)
      reload()
    } catch (err) {
      setUploadPhase('failed')
      setUploadError(err instanceof Error ? err.message : 'Erro no upload')
    } finally {
      setUploading(false)
    }
  }

  const handleUploadProgressContinue = () => {
    setUploadProgressOpen(false)
    const doc = pendingUploadDoc
    setPendingUploadDoc(null)
    setPendingUploadType('')
    if (doc) {
      message.success(t('personalDocument.uploadSuccess'))
      finishPersonalUploadFlow(doc)
    }
  }

  const handleVisualReviewConfirm = async (args: {
    extractedText: string
    ocrLayout: import('../../../lib/api.types.js').OcrLayout
  }) => {
    if (!visualReviewDoc) return
    await api.documents.update(visualReviewDoc.id, {
      extractedText: args.extractedText,
      ocrLayout: args.ocrLayout,
      ocrProcessed: true,
    })
    const savedDoc = {
      ...visualReviewDoc,
      extractedText: args.extractedText,
      ocrLayout: args.ocrLayout,
    }
    setVisualReviewDoc(null)
    reload()
    openIdentityReview(savedDoc, savedDoc.suggestedPatient)
  }

  const handleConfirmIdentity = async () => {
    if (!identityDoc) return
    setConfirmingIdentity(true)
    try {
      if (applyCpf || applyName || applyBirthDate) {
        await api.documents.applyIdentity(identityDoc.id, {
          applyCpf,
          applyName,
          applyBirthDate,
          cpf: suggested.cpf?.replace(/\D/g, ''),
          name: suggested.name,
          birthDate: suggested.birthDate,
        })
        message.success(t('personalDocument.identityApplied'))
      } else {
        message.success(t('personalDocument.uploadSuccess'))
      }
      setIdentityReviewOpen(false)
      setIdentityDoc(null)
      reload()
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Erro ao aplicar dados')
    } finally {
      setConfirmingIdentity(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.documents.delete(id)
      message.success(t('personalDocument.deleteSuccess'))
      reload()
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Erro ao excluir')
    }
  }

  const openAllAttached = () => {
    const latest = PERSONAL_DOC_SLOTS
      .map((s) => docsByType.get(s.type)?.[0])
      .filter(Boolean) as Document_[]
    if (latest.length === 0) {
      message.info(t('personalDocument.noneToPresent'))
      return
    }
    for (const doc of latest) {
      window.open(documentDownloadUrl(doc.id), '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <>
      <DismissibleHint
        hintId="personal-documents.intro"
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
        message={t('personalDocument.introTitle')}
        description={t('personalDocument.introDescription')}
      />

      <Space style={{ marginBottom: 20 }} wrap>
        <Tag icon={<CheckCircleOutlined />} color={attachedCount > 0 ? 'success' : 'default'}>
          {attachedCount > 0
            ? t('personalDocument.attachedCount', { count: attachedCount })
            : t('personalDocument.noneAttached')}
        </Tag>
        {attachedCount > 0 && (
          <Button icon={<EyeOutlined />} onClick={openAllAttached}>
            {t('personalDocument.presentAll')}
          </Button>
        )}
      </Space>

      <Row gutter={[16, 16]}>
        {PERSONAL_DOC_SLOTS.map((slot) => {
          const docs = docsByType.get(slot.type) ?? []
          const latest = docs[0]
          return (
            <Col xs={24} sm={12} lg={6} key={slot.type}>
              <Card
                loading={loading}
                size="small"
                title={
                  <Space>
                    {slot.icon}
                    <span>{t(`documentType.${slot.type}`)}</span>
                  </Space>
                }
                extra={
                  latest
                    ? <Tag color="success">{t('personalDocument.attached')}</Tag>
                    : <Tag>{t('personalDocument.missing')}</Tag>
                }
                actions={[
                  <Button
                    key="add"
                    type="link"
                    icon={<PlusOutlined />}
                    onClick={() => { setUploadType(slot.type); setFile(null) }}
                  >
                    {latest ? t('personalDocument.replace') : t('personalDocument.attach')}
                  </Button>,
                  ...(latest ? [
                    <Button
                      key="view"
                      type="link"
                      icon={<EyeOutlined />}
                      onClick={() => window.open(documentDownloadUrl(latest.id), '_blank', 'noopener,noreferrer')}
                    >
                      {t('personalDocument.view')}
                    </Button>,
                    <Popconfirm
                      key="delete"
                      title={t('personalDocument.deleteConfirm')}
                      onConfirm={() => handleDelete(latest.id)}
                      okText={t('common.delete')}
                      cancelText={t('common.cancel')}
                      okButtonProps={{ danger: true }}
                    >
                      <Button type="link" danger icon={<DeleteOutlined />} />
                    </Popconfirm>,
                  ] : []),
                ]}
              >
                <Paragraph type="secondary" style={{ fontSize: 12, minHeight: 40, marginBottom: 8 }}>
                  {slot.hint}
                </Paragraph>
                {latest ? (
                  <Space direction="vertical" size={4}>
                    <Text ellipsis style={{ maxWidth: '100%' }}>{latest.originalFilename}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {new Date(latest.uploadedAt).toLocaleDateString('pt-BR')}
                      {latest.fileSizeBytes ? ` · ${(latest.fileSizeBytes / 1024).toFixed(0)} KB` : ''}
                    </Text>
                    {docs.length > 1 && (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        +{docs.length - 1} {t('personalDocument.olderVersions')}
                      </Text>
                    )}
                  </Space>
                ) : (
                  <Text type="secondary" style={{ fontSize: 12 }}>{t('personalDocument.notYetAttached')}</Text>
                )}
              </Card>
            </Col>
          )
        })}
      </Row>

      {personalDocs.length > 0 && (
        <Card size="small" title={t('personalDocument.allFiles')} style={{ marginTop: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {personalDocs.map((doc) => (
              <Space key={doc.id} wrap style={{ justifyContent: 'space-between', width: '100%' }}>
                <Space>
                  <Tag>{t(`documentType.${doc.documentType}`)}</Tag>
                  <Text>{doc.originalFilename}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(doc.uploadedAt).toLocaleDateString('pt-BR')}
                  </Text>
                </Space>
                <Space>
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => window.open(documentDownloadUrl(doc.id), '_blank', 'noopener,noreferrer')}
                  >
                    {t('personalDocument.view')}
                  </Button>
                  <Popconfirm
                    title={t('personalDocument.deleteConfirm')}
                    onConfirm={() => handleDelete(doc.id)}
                    okText={t('common.delete')}
                    cancelText={t('common.cancel')}
                    okButtonProps={{ danger: true }}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </Space>
            ))}
          </Space>
        </Card>
      )}

      <Modal
        title={
          uploadType
            ? `${t('personalDocument.attach')} — ${t(`documentType.${uploadType}`)}`
            : t('personalDocument.attach')
        }
        open={uploadType !== null}
        onOk={handleUpload}
        onCancel={() => { setUploadType(null); setFile(null) }}
        confirmLoading={uploading}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        okButtonProps={{ disabled: !file, icon: <CloudUploadOutlined /> }}
      >
        <Dragger
          accept="image/jpeg,image/png,image/gif,image/bmp,image/webp,application/pdf"
          beforeUpload={(f) => { setFile(f); return false }}
          onRemove={() => setFile(null)}
          fileList={file ? [{ uid: '-1', name: file.name, status: 'done' }] : []}
          maxCount={1}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">{t('document.dropHint')}</p>
          <p className="ant-upload-hint">{t('personalDocument.uploadHint')}</p>
        </Dragger>
      </Modal>

      <DocumentUploadProgressModal
        open={uploadProgressOpen}
        documentType={pendingUploadType || uploadType || 'certidao_nascimento'}
        fileName={pendingUploadDoc?.originalFilename ?? uploadFileName}
        phase={uploadPhase}
        uploadPercent={uploadPercent}
        message={uploadMessage}
        error={uploadError}
        onClose={handleUploadProgressContinue}
      />

      <OcrRegionReviewModal
        open={!!visualReviewDoc}
        document={visualReviewDoc}
        identityMode
        onClose={() => setVisualReviewDoc(null)}
        onConfirm={handleVisualReviewConfirm}
      />

      <Modal
        title={t('personalDocument.identityReviewTitle')}
        open={identityReviewOpen}
        onOk={handleConfirmIdentity}
        onCancel={() => { setIdentityReviewOpen(false); setIdentityDoc(null) }}
        confirmLoading={confirmingIdentity}
        okText={t('personalDocument.applyToPatient')}
        cancelText={t('common.cancel')}
      >
        {identityDoc && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="secondary">{identityDoc.originalFilename}</Text>
            <Form layout="vertical">
              <Form.Item label="CPF">
                <Space>
                  <Checkbox checked={applyCpf} onChange={(e) => setApplyCpf(e.target.checked)} />
                  <Input
                    value={suggested.cpf || ''}
                    onChange={(e) => setSuggested((s) => ({ ...s, cpf: e.target.value }))}
                    placeholder="000.000.000-00"
                  />
                </Space>
              </Form.Item>
              <Form.Item label={t('patient.name')}>
                <Space>
                  <Checkbox checked={applyName} onChange={(e) => setApplyName(e.target.checked)} />
                  <Input
                    value={suggested.name || ''}
                    onChange={(e) => setSuggested((s) => ({ ...s, name: e.target.value }))}
                  />
                </Space>
              </Form.Item>
              <Form.Item label={t('patient.birthDate')}>
                <Space>
                  <Checkbox checked={applyBirthDate} onChange={(e) => setApplyBirthDate(e.target.checked)} />
                  <MaskedDatePicker
                    value={suggested.birthDate ? dayjs(suggested.birthDate) : null}
                    onChange={(d) => setSuggested((s) => ({ ...s, birthDate: d ? d.format('YYYY-MM-DD') : undefined }))}
                  />
                </Space>
              </Form.Item>
            </Form>
            <Alert
              type="info"
              showIcon
              message={t('personalDocument.identityReviewHint')}
            />
          </Space>
        )}
      </Modal>
    </>
  )
}
