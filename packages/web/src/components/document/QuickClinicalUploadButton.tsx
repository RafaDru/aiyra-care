import { useState } from 'react'
import { App, Button, Upload } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import type { Document_ } from '../../lib/api.types.js'
import { uploadDocumentWithProgress, type DocumentUploadPhase } from '../../lib/document-upload.js'
import { canUseOcrRegionReview } from '../../lib/ocr-layout.js'
import { DocumentUploadProgressModal } from './DocumentUploadProgressModal.js'
import { OcrRegionReviewModal } from './OcrRegionReviewModal.js'
import { InterpretHandwritingModal } from '../scraper/InterpretHandwritingModal.js'

export type QuickClinicalDocumentType = 'vaccine_card' | 'prescription' | 'exam'

interface Props {
  patientId: string
  documentType: QuickClinicalDocumentType
  onRecordsUpdated?: () => void
}

const LABEL_KEYS: Record<QuickClinicalDocumentType, string> = {
  vaccine_card: 'vaccine.uploadCard',
  prescription: 'medication.uploadPrescription',
  exam: 'exam.upload',
}

export function QuickClinicalUploadButton({ patientId, documentType, onRecordsUpdated }: Props) {
  const { t } = useTranslation()
  const { message } = App.useApp()

  const [uploadProgressOpen, setUploadProgressOpen] = useState(false)
  const [uploadPhase, setUploadPhase] = useState<DocumentUploadPhase>('upload')
  const [uploadPercent, setUploadPercent] = useState(0)
  const [uploadMessage, setUploadMessage] = useState<string | undefined>()
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [pendingUploadDoc, setPendingUploadDoc] = useState<Document_ | null>(null)
  const [uploadFileName, setUploadFileName] = useState<string | undefined>()
  const [uploading, setUploading] = useState(false)

  const [visualReviewDoc, setVisualReviewDoc] = useState<Document_ | null>(null)
  const [interpretDoc, setInterpretDoc] = useState<Document_ | null>(null)

  const finishUploadFlow = (doc: Document_, type: QuickClinicalDocumentType) => {
    if (type === 'prescription') {
      setInterpretDoc(doc)
      return
    }
    if (canUseOcrRegionReview(doc.mimeType, doc.ocrLayout)) {
      setVisualReviewDoc(doc)
      return
    }
    message.success(t('document.uploadSuccess'))
    onRecordsUpdated?.()
  }

  const startUpload = async (file: File) => {
    setUploadProgressOpen(true)
    setUploadPhase('upload')
    setUploadPercent(0)
    setUploadMessage(undefined)
    setUploadError(null)
    setPendingUploadDoc(null)
    setUploadFileName(file.name)
    setUploading(true)
    try {
      const doc = await uploadDocumentWithProgress(patientId, documentType, file, (p) => {
        setUploadPhase(p.phase)
        setUploadPercent(p.uploadPercent ?? 0)
        setUploadMessage(p.message)
      })
      setPendingUploadDoc(doc)
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
    if (doc) finishUploadFlow(doc, documentType)
  }

  const handleVisualReviewConfirm = async (args: {
    extractedText: string
    ocrLayout: import('../../lib/api.types.js').OcrLayout
  }) => {
    if (!visualReviewDoc) return
    await api.documents.update(visualReviewDoc.id, {
      extractedText: args.extractedText,
      ocrLayout: args.ocrLayout,
      ocrProcessed: true,
    })
    message.success(t('document.uploadSuccess'))
    setVisualReviewDoc(null)
    onRecordsUpdated?.()
  }

  const closeVisualReview = () => {
    setVisualReviewDoc(null)
    onRecordsUpdated?.()
  }

  return (
    <>
      <Upload
        accept="image/*,.pdf"
        showUploadList={false}
        disabled={uploading}
        beforeUpload={(file) => {
          void startUpload(file)
          return false
        }}
      >
        <Button icon={<UploadOutlined />} disabled={uploading}>
          {t(LABEL_KEYS[documentType])}
        </Button>
      </Upload>

      <DocumentUploadProgressModal
        open={uploadProgressOpen}
        documentType={documentType}
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
        onClose={closeVisualReview}
        onConfirm={handleVisualReviewConfirm}
      />

      <InterpretHandwritingModal
        open={!!interpretDoc}
        document={interpretDoc}
        patientId={patientId}
        onClose={() => setInterpretDoc(null)}
        onMedicationsCreated={() => {
          onRecordsUpdated?.()
        }}
      />
    </>
  )
}
