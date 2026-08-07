import { useMemo } from 'react'
import { Modal, Steps, Typography, Spin, Button, Alert } from 'antd'
import {
  LoadingOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  CloudUploadOutlined,
} from '@ant-design/icons'
import {
  uploadStepsForDocumentType,
  stepIndexForPhase,
} from '../../lib/document-upload-profile.js'
import type { DocumentUploadPhase } from '../../lib/document-upload.js'

const { Text, Title } = Typography

interface Props {
  open: boolean
  documentType: string
  fileName?: string
  phase: DocumentUploadPhase
  uploadPercent?: number
  message?: string
  error?: string | null
  onClose?: () => void
}

function stepStatus(
  idx: number,
  current: number,
  phase: DocumentUploadPhase,
): 'wait' | 'process' | 'finish' | 'error' {
  if (phase === 'failed' && idx === current) return 'error'
  if (idx < current) return 'finish'
  if (idx === current && phase !== 'done' && phase !== 'failed') return 'process'
  if (phase === 'done' && idx === current) return 'finish'
  return 'wait'
}

export function DocumentUploadProgressModal({
  open,
  documentType,
  fileName,
  phase,
  uploadPercent = 0,
  message,
  error,
  onClose,
}: Props) {
  const steps = useMemo(() => uploadStepsForDocumentType(documentType), [documentType])
  const current = stepIndexForPhase(steps, phase, uploadPercent)
  const running = phase === 'upload' || phase === 'processing'
  const failed = phase === 'failed'
  const done = phase === 'done'

  const items = steps.map((s, i) => {
    let description = s.description
    if (s.key === 'upload' && phase === 'upload' && uploadPercent > 0) {
      description = `${uploadPercent}% enviado`
    }
    if (s.key === 'ocr' && phase === 'processing') {
      description = message || s.description
    }
    return {
      title: s.title,
      description,
      status: stepStatus(i, current, phase),
    }
  })

  return (
    <Modal
      open={open}
      footer={
        (done || failed) && onClose
          ? [<Button key="close" type="primary" onClick={onClose}>Continuar</Button>]
          : null
      }
      closable={done || failed}
      maskClosable={done || failed}
      onCancel={done || failed ? onClose : undefined}
      width={520}
      centered
    >
      <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
        {running && <Spin indicator={<LoadingOutlined style={{ fontSize: 40 }} spin />} />}
        {done && <CheckCircleFilled style={{ fontSize: 40, color: '#52c41a' }} />}
        {failed && <CloseCircleFilled style={{ fontSize: 40, color: '#ff4d4f' }} />}

        <Title level={4} style={{ marginTop: 16 }}>
          {running ? 'Processando documento…' : done ? 'Documento processado' : 'Erro no processamento'}
        </Title>

        {fileName && (
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            <CloudUploadOutlined /> {fileName}
          </Text>
        )}

        {failed && error && (
          <Alert type="error" showIcon message={error} style={{ marginBottom: 16, textAlign: 'left' }} />
        )}

        {running && phase === 'processing' && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16, textAlign: 'left' }}
            message={
              documentType === 'vaccine_card'
                ? 'OCR de carteira de vacina'
                : 'OCR pode levar alguns minutos'
            }
            description={
              documentType === 'vaccine_card'
                ? 'Modo otimizado para células e manuscrito em campos pequenos. Use zoom e «Interpretar carteira» após o envio.'
                : 'TrOCR na primeira receita manuscrita baixa o modelo; cartões e documentos impressos são mais rápidos.'
            }
          />
        )}

        <div style={{ marginTop: 16, textAlign: 'left' }}>
          <Steps direction="vertical" size="small" current={current} items={items} />
        </div>

        {message && running && (
          <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
            {message}
          </Text>
        )}
      </div>
    </Modal>
  )
}
