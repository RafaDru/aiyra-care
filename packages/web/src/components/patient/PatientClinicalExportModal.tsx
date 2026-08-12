import { useRef } from 'react'
import { Button, Modal } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'
import type { PatientContext } from '../../lib/api.types.js'
import { CLINICAL_EXPORT_COPY } from './clinical-export-copy.js'
import { PatientClinicalExportSheet, printClinicalExportSheet } from './PatientClinicalExportSheet.js'

interface PatientClinicalExportModalProps {
  open: boolean
  context: PatientContext | null
  onClose: () => void
}

export function PatientClinicalExportModal({
  open,
  context,
  onClose,
}: PatientClinicalExportModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    if (!sheetRef.current || !context) return
    const title = `${CLINICAL_EXPORT_COPY.title} — ${context.identity.name}`
    printClinicalExportSheet(sheetRef.current, title)
  }

  return (
    <Modal
      open={open}
      title={CLINICAL_EXPORT_COPY.previewTitle}
      onCancel={onClose}
      width={720}
      footer={[
        <Button key="close" onClick={onClose}>{CLINICAL_EXPORT_COPY.closeButton}</Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          onClick={handlePrint}
          disabled={!context}
        >
          {CLINICAL_EXPORT_COPY.printButton}
        </Button>,
      ]}
      destroyOnClose
    >
      {context && (
        <div ref={sheetRef}>
          <PatientClinicalExportSheet context={context} />
        </div>
      )}
    </Modal>
  )
}
