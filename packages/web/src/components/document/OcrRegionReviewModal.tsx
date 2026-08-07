import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Modal, Input, Typography, Space, Tag, Alert, Button, Tooltip, Slider, List, App } from 'antd'
import {
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  BulbOutlined,
  MedicineBoxOutlined,
} from '@ant-design/icons'
import type { Document_, OcrLayout, OcrRegion, SuggestedPatientFields, VaccineCardInterpretation } from '../../lib/api.types.js'
import { api, documentDownloadUrl } from '../../lib/api.js'
import { textFromOcrLayout, normalizeOcrLayoutForDisplay } from '../../lib/ocr-layout.js'

const { Text } = Typography
const { TextArea } = Input

const MIN_ZOOM = 0.5
const MAX_ZOOM = 4

interface Props {
  open: boolean
  document: Document_ | null
  suggestedPatient?: SuggestedPatientFields
  identityMode?: boolean
  onClose: () => void
  onConfirm: (args: {
    extractedText: string
    ocrLayout: OcrLayout
    suggestedPatient?: SuggestedPatientFields
  }) => Promise<void>
}

function isVaccineInterpretation(raw: unknown): raw is VaccineCardInterpretation {
  return !!raw && typeof raw === 'object' && 'entries' in raw && Array.isArray((raw as VaccineCardInterpretation).entries)
}

export function OcrRegionReviewModal({
  open,
  document,
  suggestedPatient,
  identityMode,
  onClose,
  onConfirm,
}: Props) {
  const { message } = App.useApp()
  const imgRef = useRef<HTMLImageElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [regions, setRegions] = useState<OcrRegion[]>([])
  const [layoutMeta, setLayoutMeta] = useState<{ w: number; h: number } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [baseWidth, setBaseWidth] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [confirming, setConfirming] = useState(false)
  const [editText, setEditText] = useState('')
  const [interpreting, setInterpreting] = useState(false)
  const [vaccineInterpretation, setVaccineInterpretation] = useState<VaccineCardInterpretation | null>(null)
  const [creatingVaccines, setCreatingVaccines] = useState(false)

  const layout = document?.ocrLayout
  const isVaccineCard = document?.documentType === 'vaccine_card'

  useEffect(() => {
    if (!open) return
    setZoom(1)
    setVaccineInterpretation(null)
  }, [open, document?.id])

  useEffect(() => {
    if (!open || !layout) return
    const normalized = normalizeOcrLayoutForDisplay(layout)
    setRegions(normalized.regions.map((r) => ({ ...r })))
    setLayoutMeta({ w: normalized.imageWidth, h: normalized.imageHeight })
    setSelectedId(normalized.regions[0]?.id ?? null)
    setEditText(normalized.regions[0]?.text ?? '')
  }, [open, document?.id, layout])

  useEffect(() => {
    if (!open || !document || !isVaccineCard) return
    api.documents.getInterpretation(document.id).then((r) => {
      if (r.interpretation && isVaccineInterpretation(r.interpretation)) {
        setVaccineInterpretation(r.interpretation)
      }
    }).catch(() => {})
  }, [open, document, isVaccineCard])

  const measureViewport = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    setBaseWidth(el.clientWidth)
  }, [])

  useEffect(() => {
    if (!open) return
    const el = viewportRef.current
    if (!el) return
    const ro = new ResizeObserver(() => measureViewport())
    ro.observe(el)
    measureViewport()
    return () => ro.disconnect()
  }, [open, document?.id, measureViewport])

  const selected = regions.find((r) => r.id === selectedId)

  const renderedWidth = baseWidth > 0 ? baseWidth * zoom : 0
  const renderedHeight = layoutMeta && renderedWidth > 0
    ? (layoutMeta.h / layoutMeta.w) * renderedWidth
    : 0

  const scale = useMemo(() => {
    if (!layoutMeta || renderedWidth <= 0) return { x: 1, y: 1 }
    return {
      x: renderedWidth / layoutMeta.w,
      y: renderedHeight / layoutMeta.h,
    }
  }, [layoutMeta, renderedWidth, renderedHeight])

  const selectRegion = (r: OcrRegion) => {
    setSelectedId(r.id)
    setEditText(r.text)
  }

  const applyEdit = () => {
    if (!selectedId) return
    setRegions((prev) => prev.map((r) => (r.id === selectedId ? { ...r, text: editText } : r)))
  }

  const fullText = useMemo(() => {
    if (!layoutMeta) return ''
    return textFromOcrLayout({
      imageWidth: layoutMeta.w,
      imageHeight: layoutMeta.h,
      regions,
    })
  }, [regions, layoutMeta])

  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 1.12 : 0.89
    setZoom((z) => clampZoom(z * delta))
  }

  const runVaccineInterpret = async () => {
    if (!document) return
    setInterpreting(true)
    try {
      const result = await api.documents.interpretVaccineCard(document.id)
      setVaccineInterpretation(result.interpretation)
      message.success('Carteira interpretada — revise vacinas e anotações manuscritas')
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Erro na interpretação')
    } finally {
      setInterpreting(false)
    }
  }

  const createVaccineRecords = async () => {
    if (!document || !vaccineInterpretation?.entries.length) return
    setCreatingVaccines(true)
    try {
      let created = 0
      let skipped = 0
      for (const entry of vaccineInterpretation.entries) {
        if (!entry.vaccineName?.trim()) continue
        if (!entry.applicationDate) {
          skipped++
          continue
        }
        const doseRaw = entry.doseNumber ? String(entry.doseNumber).replace(/\D/g, '') : ''
        const doseNumber = doseRaw ? Number.parseInt(doseRaw, 10) : undefined
        const notes = [
          entry.handwrittenNotes,
          entry.doseNumber && !doseNumber ? `Dose: ${entry.doseNumber}` : null,
        ].filter(Boolean).join(' · ')
        await api.vaccines.create({
          patientId: document.patientId,
          vaccineName: entry.vaccineName,
          doseNumber: doseNumber && !Number.isNaN(doseNumber) ? doseNumber : undefined,
          batchNumber: entry.batchNumber || undefined,
          applicationDate: entry.applicationDate,
          appliedBy: entry.appliedBy || undefined,
          clinic: entry.clinic || undefined,
          notes: notes || undefined,
          source: 'document_ocr',
        })
        created++
      }
      if (created > 0) {
        message.success(`${created} vacina(s) cadastrada(s) — revise na aba Vacinas`)
      }
      if (skipped > 0) {
        message.warning(`${skipped} entrada(s) sem data de aplicação — cadastre manualmente na aba Vacinas`)
      }
      if (created === 0 && skipped === 0) {
        message.info('Nenhuma vacina com dados suficientes para cadastro automático')
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Erro ao cadastrar vacinas')
    } finally {
      setCreatingVaccines(false)
    }
  }

  const handleOk = async () => {
    if (!layoutMeta) return
    setConfirming(true)
    try {
      const ocrLayout: OcrLayout = {
        imageWidth: layoutMeta.w,
        imageHeight: layoutMeta.h,
        regions,
      }
      await onConfirm({
        extractedText: textFromOcrLayout(ocrLayout),
        ocrLayout,
        suggestedPatient,
      })
    } finally {
      setConfirming(false)
    }
  }

  if (!document || !layout) return null

  return (
    <Modal
      title={<><FileTextOutlined /> Revisão do OCR na imagem</>}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={confirming}
      okText="Confirmar e salvar"
      cancelText="Fechar"
      width={960}
      destroyOnClose
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message="Clique em uma área destacada para corrigir o texto. Use zoom para ler manuscrito em células pequenas."
        />
        {isVaccineCard && (
          <Alert
            type="success"
            showIcon
            message="Cartão de vacina"
            description="Linhas impressas indicam a vacina; profissionais costumam preencher data, lote e observações à mão. Use «Interpretar carteira» para estruturar com IA (consome crédito de interpretação)."
          />
        )}
        <Space wrap>
          <Tag color="blue">{document.originalFilename}</Tag>
          {document.ocrProcessed
            ? <Tag icon={<CheckCircleOutlined />} color="success">OCR processado</Tag>
            : <Tag icon={<CloseCircleOutlined />} color="warning">OCR parcial</Tag>}
          {document.ocrProvider && <Tag>{document.ocrProvider}</Tag>}
        </Space>

        <Space wrap align="center">
          <Tooltip title="Diminuir zoom">
            <Button
              icon={<ZoomOutOutlined />}
              onClick={() => setZoom((z) => clampZoom(z - 0.25))}
              disabled={zoom <= MIN_ZOOM}
            />
          </Tooltip>
          <Slider
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.05}
            value={zoom}
            onChange={setZoom}
            style={{ width: 140, margin: '0 8px' }}
          />
          <Text type="secondary">{Math.round(zoom * 100)}%</Text>
          <Tooltip title="Aumentar zoom">
            <Button
              icon={<ZoomInOutlined />}
              onClick={() => setZoom((z) => clampZoom(z + 0.25))}
              disabled={zoom >= MAX_ZOOM}
            />
          </Tooltip>
          <Button size="small" onClick={() => setZoom(1)}>Ajustar à largura</Button>
        </Space>

        <div
          ref={viewportRef}
          onWheel={handleWheel}
          style={{
            maxHeight: 480,
            overflow: 'auto',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            background: '#f5f5f5',
            cursor: zoom > 1 ? 'grab' : 'default',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: renderedWidth || '100%',
              height: renderedHeight || 'auto',
              minWidth: baseWidth || undefined,
            }}
          >
            <img
              ref={imgRef}
              src={documentDownloadUrl(document.id)}
              alt={document.originalFilename}
              style={{ width: renderedWidth || '100%', height: renderedHeight || 'auto', display: 'block' }}
              onLoad={measureViewport}
            />
            {renderedWidth > 0 && regions.map((r) => {
              const isSel = r.id === selectedId
              const lowConf = typeof r.confidence === 'number' && r.confidence < 60
              return (
                <Tooltip key={r.id} title={r.text}>
                  <button
                    type="button"
                    aria-label={`Editar trecho: ${r.text}`}
                    style={{
                      position: 'absolute',
                      left: r.left * scale.x,
                      top: r.top * scale.y,
                      width: Math.max(r.width * scale.x, 4),
                      height: Math.max(r.height * scale.y, 4),
                      padding: 0,
                      border: isSel ? '2px solid #1677ff' : lowConf ? '1px solid #fa8c16' : '1px solid rgba(22,119,255,0.55)',
                      background: isSel ? 'rgba(22,119,255,0.35)' : lowConf ? 'rgba(250,140,22,0.22)' : 'rgba(22,119,255,0.18)',
                      cursor: 'pointer',
                      borderRadius: 2,
                    }}
                    onClick={() => selectRegion(r)}
                  />
                </Tooltip>
              )
            })}
          </div>
        </div>

        {isVaccineCard && (
          <Space wrap>
            <Button
              type="primary"
              ghost
              icon={<BulbOutlined />}
              loading={interpreting}
              onClick={runVaccineInterpret}
            >
              Interpretar carteira (IA)
            </Button>
            {vaccineInterpretation && vaccineInterpretation.entries.length > 0 && (
              <Button
                icon={<MedicineBoxOutlined />}
                loading={creatingVaccines}
                onClick={createVaccineRecords}
              >
                Cadastrar {vaccineInterpretation.entries.length} vacina(s)
              </Button>
            )}
          </Space>
        )}

        {vaccineInterpretation && vaccineInterpretation.entries.length > 0 && (
          <List
            size="small"
            bordered
            header={<Text strong>Vacinas detectadas (IA)</Text>}
            dataSource={vaccineInterpretation.entries}
            renderItem={(item) => (
              <List.Item>
                <Space direction="vertical" size={0}>
                  <Text strong>{item.vaccineName}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {[
                      item.applicationDate,
                      item.doseNumber ? `Dose ${item.doseNumber}` : null,
                      item.batchNumber ? `Lote ${item.batchNumber}` : null,
                      item.clinic,
                      item.appliedBy,
                    ].filter(Boolean).join(' · ')}
                  </Text>
                  {item.handwrittenNotes && (
                    <Text style={{ fontSize: 12 }}>Manuscrito: {item.handwrittenNotes}</Text>
                  )}
                </Space>
              </List.Item>
            )}
          />
        )}

        {vaccineInterpretation && vaccineInterpretation.warnings.length > 0 && (
          <Alert type="warning" showIcon message={vaccineInterpretation.warnings.join(' · ')} />
        )}

        {selected && (
          <div style={{ padding: 12, background: '#fafafa', borderRadius: 8 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Trecho selecionado
              {typeof selected.confidence === 'number' && (
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  confiança {selected.confidence}%
                </Text>
              )}
            </Text>
            <TextArea
              rows={3}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={applyEdit}
              style={{ fontFamily: 'inherit' }}
            />
            <Button size="small" style={{ marginTop: 8 }} onClick={applyEdit}>
              Aplicar neste trecho
            </Button>
          </div>
        )}

        <div>
          <Text strong>Texto completo (gerado das áreas)</Text>
          <TextArea
            rows={6}
            value={fullText}
            readOnly
            style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 13 }}
          />
        </div>

        {identityMode && suggestedPatient && (
          <Alert
            type="info"
            showIcon
            message="Documento de identidade — após confirmar, revise os dados detectados na próxima etapa."
          />
        )}
      </Space>
    </Modal>
  )
}
