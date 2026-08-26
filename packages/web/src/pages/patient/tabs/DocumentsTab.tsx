import { useEffect, useMemo, useState } from 'react'
import {
  Table, Button, Select, Tag, Modal, Upload, App, Input, Space, Typography, Tooltip, Empty, Alert,
  Checkbox, Form, Popconfirm, Collapse,
} from 'antd'
import { MaskedDatePicker } from '../../../components/ui/MaskedDatePicker.js'
import {
  PlusOutlined, FileTextOutlined, InboxOutlined, EyeOutlined, CheckCircleOutlined,
  CloseCircleOutlined, DeleteOutlined, BulbOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { api, documentDownloadUrl } from '../../../lib/api.js'
import { usePatientEntity } from '../../../hooks/use-patient-entity.js'
import type { Document_, Exam, HandwritingQuota, SuggestedPatientFields } from '../../../lib/api.types.js'
import { InterpretHandwritingModal, isHandwritingClinicalType } from '../../../components/scraper/InterpretHandwritingModal.js'
import { OcrRegionReviewModal } from '../../../components/document/OcrRegionReviewModal.js'
import { OcrStatsPanel } from '../../../components/document/OcrStatsPanel.js'
import { DocumentUploadProgressModal } from '../../../components/document/DocumentUploadProgressModal.js'
import { uploadDocumentWithProgress, type DocumentUploadPhase } from '../../../lib/document-upload.js'
import { isPoorHandwritingOcr } from '../../../lib/handwriting-ocr.js'
import { canUseOcrRegionReview, normalizeDisplayText } from '../../../lib/ocr-layout.js'
import { buildDocumentLinkIndex, groupPortalDocuments } from '../../../lib/document-provenance.js'
import { SourceTag } from '../../../components/ui/SourceTag.js'
import { DismissibleHint } from '../../../components/ui/DismissibleHint.js'
import { AvaPlatformHint } from '../../../components/ava/AvaPlatformHint.js'

interface Props {
  patientId: string
  onPatientUpdated?: () => void
  onOpenExamsTab?: () => void
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

type OriginFilter = 'all' | 'manual' | 'portal'

export function DocumentsTab({ patientId, onPatientUpdated, onOpenExamsTab }: Props) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { data, loading, reload } = usePatientEntity<Document_>(api.documents.list, patientId)
  const [exams, setExams] = useState<Exam[]>([])
  const [open, setOpen] = useState(false)
  const [documentType, setDocumentType] = useState<string>('prescription')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterOrigin, setFilterOrigin] = useState<OriginFilter>('manual')
  const [showSlices, setShowSlices] = useState(false)

  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewDoc, setReviewDoc] = useState<Document_ | null>(null)
  const [reviewText, setReviewText] = useState('')
  const [suggested, setSuggested] = useState<SuggestedPatientFields>({})
  const [applyCpf, setApplyCpf] = useState(true)
  const [applyName, setApplyName] = useState(false)
  const [applyBirthDate, setApplyBirthDate] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [interpretDoc, setInterpretDoc] = useState<Document_ | null>(null)
  const [visualReviewDoc, setVisualReviewDoc] = useState<Document_ | null>(null)
  const [quota, setQuota] = useState<HandwritingQuota | null>(null)
  const [uploadProgressOpen, setUploadProgressOpen] = useState(false)
  const [uploadPhase, setUploadPhase] = useState<DocumentUploadPhase>('upload')
  const [uploadPercent, setUploadPercent] = useState(0)
  const [uploadMessage, setUploadMessage] = useState<string | undefined>()
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [pendingUploadDoc, setPendingUploadDoc] = useState<Document_ | null>(null)
  const [pendingUploadType, setPendingUploadType] = useState<string>('')
  const [uploadFileName, setUploadFileName] = useState<string | undefined>()

  useEffect(() => {
    api.handwritingCredits.quota().then(setQuota).catch(() => {})
  }, [])

  useEffect(() => {
    api.exams.list(patientId).then(setExams).catch(() => setExams([]))
  }, [patientId, data.length])

  const linkIndex = useMemo(() => buildDocumentLinkIndex(exams), [exams])

  const clinicalBase = useMemo(
    () => data.filter((d) => !isIdentityType(d.documentType)),
    [data],
  )

  const filteredDocs = useMemo(() => {
    return clinicalBase.filter((doc) => {
      const link = linkIndex.get(doc.id)
      if (link?.role === 'slice' && !showSlices) return false
      if (filterType !== 'all' && doc.documentType !== filterType) return false
      if (filterOrigin === 'manual' && link) return false
      if (filterOrigin === 'portal' && !link) return false
      return true
    })
  }, [clinicalBase, linkIndex, showSlices, filterType, filterOrigin])

  const portalGroups = useMemo(() => {
    if (filterOrigin !== 'portal') return []
    return groupPortalDocuments(filteredDocs, linkIndex)
  }, [filterOrigin, filteredDocs, linkIndex])

  const hiddenSliceCount = useMemo(() => {
    let n = 0
    for (const doc of clinicalBase) {
      const link = linkIndex.get(doc.id)
      if (link?.role === 'slice') n++
    }
    return n
  }, [clinicalBase, linkIndex])

  const openReview = (doc: Document_, suggestion?: SuggestedPatientFields) => {
    setReviewDoc(doc)
    setReviewText(normalizeDisplayText(doc.extractedText || ''))
    setSuggested(suggestion || {})
    setApplyCpf(!!suggestion?.cpf)
    setApplyName(false)
    setApplyBirthDate(false)
    setReviewOpen(true)
  }

  const openReviewForDoc = (doc: Document_, suggestion?: SuggestedPatientFields) => {
    if (canUseOcrRegionReview(doc.mimeType, doc.ocrLayout)) {
      setVisualReviewDoc(doc)
      return
    }
    openReview(doc, suggestion)
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
    message.success('OCR revisado e salvo')
    const savedDoc = { ...visualReviewDoc, extractedText: args.extractedText, ocrLayout: args.ocrLayout }
    setVisualReviewDoc(null)
    reload()
    if (isIdentityType(savedDoc.documentType)) {
      openReview(savedDoc, savedDoc.suggestedPatient)
    }
  }

  const finishUploadFlow = (doc: Document_, type: string) => {
    if (isHandwritingClinicalType(type)) {
      message.info('Manuscrito detectado: OCR local é limitado. Abrindo interpretação por IA…')
      setInterpretDoc(doc)
    } else {
      openReviewForDoc(doc, doc.suggestedPatient)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    const selectedFile = file
    const selectedType = documentType
    setOpen(false)
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
    const type = pendingUploadType
    setPendingUploadDoc(null)
    setPendingUploadType('')
    if (doc) finishUploadFlow(doc, type)
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

  const renderDocActions = (r: Document_) => {
    const link = linkIndex.get(r.id)
    return (
      <Space size={4}>
        <Button
          type="text"
          icon={<EyeOutlined />}
          aria-label="Ver arquivo"
          onClick={() => window.open(documentDownloadUrl(r.id), '_blank', 'noopener,noreferrer')}
        />
        {isHandwritingClinicalType(r.documentType) && (
          <Tooltip title="Interpretar manuscrito (LLM)">
            <Button type="text" icon={<BulbOutlined />} aria-label="Interpretar" onClick={() => setInterpretDoc(r)} />
          </Tooltip>
        )}
        {link?.role === 'slice' && onOpenExamsTab && (
          <Button type="link" size="small" onClick={onOpenExamsTab}>
            Exames
          </Button>
        )}
        <Popconfirm
          title="Excluir este arquivo?"
          description={
            link
              ? 'Remove o arquivo do armazenamento. O registro do exame na aba Exames pode ficar sem laudo/imagem.'
              : 'A versão original será removida.'
          }
          okText="Excluir"
          cancelText="Cancelar"
          okButtonProps={{ danger: true }}
          onConfirm={() => handleDelete(r.id)}
        >
          <Button type="text" danger icon={<DeleteOutlined />} aria-label="Excluir arquivo" />
        </Popconfirm>
      </Space>
    )
  }

  const columns = [
    {
      title: t('document.type'),
      dataIndex: 'documentType',
      render: (v: string, r: Document_) => {
        const link = linkIndex.get(r.id)
        return (
          <Space wrap size={4}>
            <Tag color={typeColors[v]}>{t(`documentType.${v}`)}</Tag>
            {link?.role === 'slice' && (
              <Tag color="default">
                {t('document.sliceRow', {
                  index: link.sliceIndex ?? 1,
                  total: link.sliceTotal ?? 1,
                })}
              </Tag>
            )}
          </Space>
        )
      },
    },
    {
      title: t('document.origin'),
      key: 'origin',
      render: (_: unknown, r: Document_) => {
        const link = linkIndex.get(r.id)
        if (!link) return <Tag>Manual</Tag>
        return <SourceTag source={link.source} />
      },
    },
    {
      title: t('document.linkedExam'),
      key: 'exam',
      render: (_: unknown, r: Document_) => {
        const link = linkIndex.get(r.id)
        if (!link) return <Text type="secondary">—</Text>
        return (
          <Tooltip title={link.examType}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {new Date(link.examDate).toLocaleDateString('pt-BR')}
            </Text>
          </Tooltip>
        )
      },
    },
    {
      title: t('document.fileName'),
      dataIndex: 'originalFilename',
      render: (v: string) => <><FileTextOutlined /> {v}</>,
    },
    {
      title: t('document.size'),
      dataIndex: 'fileSizeBytes',
      render: (v: number | null) => v ? `${(v / 1024).toFixed(1)} KB` : '-',
    },
    {
      title: 'OCR',
      dataIndex: 'ocrProcessed',
      render: (v: boolean, r: Document_) => {
        const link = linkIndex.get(r.id)
        if (link) return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
        const poor = isPoorHandwritingOcr({
          documentType: r.documentType,
          ocrProcessed: r.ocrProcessed,
          ocrQualityScore: r.ocrQualityScore,
          extractedText: r.extractedText,
        })
        const label = poor ? 'Fraco — use IA' : v ? t('document.processed') : t('document.pending')
        const color = poor ? 'orange' : v ? 'green' : 'default'
        const useVisual = canUseOcrRegionReview(r.mimeType, r.ocrLayout)
        return (
          <Tooltip title={
            poor
              ? 'OCR local não lê bem manuscrito. Clique em 💡 Interpretar.'
              : useVisual
                ? 'Clique para revisar OCR na imagem'
                : r.extractedText ? r.extractedText.slice(0, 300) : 'Nenhum texto extraído'
          }>
            <Tag
              color={color}
              style={{ cursor: 'pointer' }}
              onClick={() => (poor ? setInterpretDoc(r) : openReviewForDoc(r))}
            >
              {poor ? <><BulbOutlined /> {label}</> : v ? <><EyeOutlined /> {label}</> : <><CloseCircleOutlined /> {label}</>}
            </Tag>
          </Tooltip>
        )
      },
    },
    {
      title: t('document.upload'),
      dataIndex: 'uploadedAt',
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      render: (_: unknown, r: Document_) => renderDocActions(r),
    },
  ]

  const identityMode = reviewDoc ? isIdentityType(reviewDoc.documentType) : isIdentityType(documentType)

  return (
    <>
      <OcrStatsPanel />
      <AvaPlatformHint patientId={patientId} context="documents" />
      <DismissibleHint
        hintId="documents.portal-imports"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Arquivos importados dos portais"
        description={
          <span>
            {t('document.portalImportsHint')}
            {hiddenSliceCount > 0 && !showSlices && (
              <> · <Text type="secondary">{hiddenSliceCount} cortes ocultos</Text></>
            )}
            {onOpenExamsTab && (
              <>
                {' '}
                <Button type="link" size="small" style={{ padding: 0 }} onClick={onOpenExamsTab}>
                  Abrir aba Exames
                </Button>
              </>
            )}
          </span>
        }
      />
      <DismissibleHint
        hintId="documents.handwriting-ocr"
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="Receitas manuscritas"
        description="OCR automático (Tesseract/TrOCR) funciona bem em documentos impressos e identidade, mas falha muito em caligrafia médica. Para receitas como a do Luís, use o botão 💡 Interpretar — consome 1 crédito da franquia mensal ou do pacote."
      />
      {quota && (
        <Alert
          type={quota.totalAvailable > 0 ? 'success' : 'warning'}
          showIcon
          style={{ marginBottom: 16 }}
          message={`Créditos de interpretação: ${quota.totalAvailable} (${quota.monthlyFreeRemaining} grátis/mês + ${quota.packageCredits} pacote)`}
        />
      )}
      <Space wrap style={{ marginBottom: 16 }} align="center">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setDocumentType('prescription'); setOpen(true) }}>
          {t('document.new')}
        </Button>
        <Select
          value={filterOrigin}
          onChange={setFilterOrigin}
          style={{ minWidth: 180 }}
          options={[
            { value: 'manual', label: t('document.originManual') },
            { value: 'portal', label: t('document.originPortal') },
            { value: 'all', label: t('document.originAll') },
          ]}
        />
        <Select
          value={filterType}
          onChange={setFilterType}
          style={{ minWidth: 140 }}
          options={[
            { value: 'all', label: t('document.type') + ': todos' },
            ...CLINICAL_TYPES.map((value) => ({ value, label: t(`documentType.${value}`) })),
          ]}
        />
        <Checkbox checked={showSlices} onChange={(e) => setShowSlices(e.target.checked)}>
          {t('document.showSlices')}
        </Checkbox>
      </Space>

      {filterOrigin === 'portal' && portalGroups.length > 0 ? (
        <Collapse
          accordion
          style={{ marginBottom: 16 }}
          items={portalGroups.map((g) => ({
            key: g.examId,
            label: (
              <Space wrap>
                <SourceTag source={g.source} />
                <Text strong>{g.examType}</Text>
                <Text type="secondary">{new Date(g.examDate).toLocaleDateString('pt-BR')}</Text>
                {g.report && <Tag color="geekblue">{t('document.portalGroupLaudo')}</Tag>}
                {g.slices.length > 0 && (
                  <Tag>{t('document.portalGroupSlices', { count: g.slices.length })}</Tag>
                )}
              </Space>
            ),
            children: (
              <Table
                dataSource={[
                  ...(g.report ? [g.report.doc] : []),
                  ...g.slices.map((s) => s.doc),
                ]}
                columns={columns}
                rowKey="id"
                pagination={false}
                size="small"
              />
            ),
          }))}
        />
      ) : (
        <Table
          dataSource={filteredDocs}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="small"
          locale={{ emptyText: <Empty description="Nenhum arquivo neste filtro" /> }}
        />
      )}

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
          <Select
            value={documentType}
            onChange={setDocumentType}
            style={{ width: '100%' }}
            options={CLINICAL_TYPES.map((value) => ({ value, label: t(`documentType.${value}`) }))}
          />
        </div>
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
              : 'Preferir foto/scan nítido (JPEG/PNG ou PDF)'}
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
                      <MaskedDatePicker
                        value={suggested.birthDate ? dayjs(suggested.birthDate) : null}
                        onChange={(d) => setSuggested((s) => ({ ...s, birthDate: d ? d.format('YYYY-MM-DD') : undefined }))}
                      />
                    </Space>
                  </Form.Item>
                </Form>
              </div>
            )}

            <div style={{ marginBottom: 8 }}>
              <Text strong>Texto extraído:</Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>(edite se necessário)</Text>
            </div>
            <TextArea rows={10} value={reviewText} onChange={(e) => setReviewText(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 13 }} />
            {!reviewDoc.ocrProcessed && (
              <Alert type="warning" showIcon message="OCR automático falhou ou ficou incompleto. Revise o texto antes de confirmar." style={{ marginTop: 12 }} />
            )}
          </div>
        )}
      </Modal>

      <DocumentUploadProgressModal
        open={uploadProgressOpen}
        documentType={pendingUploadType || documentType}
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
        identityMode={visualReviewDoc ? isIdentityType(visualReviewDoc.documentType) : false}
        onClose={() => setVisualReviewDoc(null)}
        onConfirm={handleVisualReviewConfirm}
      />

      <InterpretHandwritingModal
        open={!!interpretDoc}
        document={interpretDoc}
        patientId={patientId}
        onClose={() => setInterpretDoc(null)}
        onMedicationsCreated={() => {
          api.handwritingCredits.quota().then(setQuota).catch(() => {})
        }}
      />
    </>
  )
}
