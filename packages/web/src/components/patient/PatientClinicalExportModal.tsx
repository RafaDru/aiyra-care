import { useEffect, useRef, useState } from 'react'
import { Button, Modal, Radio, message } from 'antd'
import { LinkOutlined, PrinterOutlined } from '@ant-design/icons'
import type { PatientClinicalExport, PatientContext } from '../../lib/api.types.js'
import { api } from '../../lib/api.js'
import { CLINICAL_EXPORT_COPY } from './clinical-export-copy.js'
import { PatientClinicalExportSheet, printClinicalExportSheet } from './PatientClinicalExportSheet.js'

interface PatientClinicalExportModalProps {
  open: boolean
  patientId: string
  context: PatientContext | null
  onClose: () => void
}

export function PatientClinicalExportModal({
  open,
  patientId,
  context,
  onClose,
}: PatientClinicalExportModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<'summary' | 'full'>('summary')
  const [exportData, setExportData] = useState<PatientClinicalExport | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !patientId) return
    setLoading(true)
    api.patients.clinicalExport(patientId, mode)
      .then((data) => setExportData(data))
      .catch((err) => message.error(err instanceof Error ? err.message : 'Falha ao carregar export'))
      .finally(() => setLoading(false))
  }, [open, patientId, mode])

  const activeContext = exportData?.context ?? context

  const handlePrint = () => {
    if (!sheetRef.current || !activeContext) return
    const title = `${CLINICAL_EXPORT_COPY.title} — ${activeContext.identity.name}`
    printClinicalExportSheet(sheetRef.current, title)
  }

  const handleShare = async () => {
    try {
      const share = await api.patients.createClinicalExportShare(patientId, { mode, ttlHours: 48 })
      await navigator.clipboard.writeText(share.shareUrl)
      message.success(CLINICAL_EXPORT_COPY.shareCopied)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Falha ao criar link')
    }
  }

  return (
    <Modal
      open={open}
      title={CLINICAL_EXPORT_COPY.previewTitle}
      onCancel={onClose}
      width={720}
      footer={[
        <Radio.Group
          key="mode"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          optionType="button"
          buttonStyle="solid"
          options={[
            { label: 'Resumido', value: 'summary' },
            { label: 'Completo', value: 'full' },
          ]}
        />,
        <Button key="share" icon={<LinkOutlined />} onClick={handleShare} disabled={loading}>
          {CLINICAL_EXPORT_COPY.shareButton}
        </Button>,
        <Button key="close" onClick={onClose}>{CLINICAL_EXPORT_COPY.closeButton}</Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          onClick={handlePrint}
          disabled={!activeContext || loading}
        >
          {CLINICAL_EXPORT_COPY.printButton}
        </Button>,
      ]}
      destroyOnClose
    >
      {activeContext && (
        <div ref={sheetRef}>
          <PatientClinicalExportSheet
            context={activeContext}
            mode={exportData?.mode ?? mode}
            fullSections={exportData?.fullSections}
          />
        </div>
      )}
    </Modal>
  )
}
