import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Button, Divider, Input, Modal, QRCode, Radio, Space, Typography, message } from 'antd'
import {
  LinkOutlined,
  MailOutlined,
  PrinterOutlined,
  QrcodeOutlined,
  WhatsAppOutlined,
} from '@ant-design/icons'
import type { PatientClinicalExport, PatientContext } from '../../lib/api.types.js'
import { api } from '../../lib/api.js'
import { CLINICAL_EXPORT_COPY } from './clinical-export-copy.js'
import { PatientClinicalExportSheet, printClinicalExportSheet } from './PatientClinicalExportSheet.js'
import { requestClinicalExportOpen } from '../../lib/clinical-export-bus.js'
import { trackProductEvent } from '../../lib/product-events.js'

const { Text, Paragraph } = Typography

interface ConsultVisitWizardModalProps {
  open: boolean
  patientId: string
  patientName?: string
  context?: PatientContext | null
  onClose: () => void
}

export function ConsultVisitWizardModal({
  open,
  patientId,
  patientName,
  context,
  onClose,
}: ConsultVisitWizardModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<'summary' | 'full'>('summary')
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [doctorEmail, setDoctorEmail] = useState('')
  const [doctorName, setDoctorName] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [exportData, setExportData] = useState<PatientClinicalExport | null>(null)
  const [printLoading, setPrintLoading] = useState(false)

  const refreshShare = useCallback(async () => {
    setShareLoading(true)
    try {
      const share = await api.patients.createClinicalExportShare(patientId, { mode, ttlHours: 48 })
      setShareUrl(share.shareUrl)
      setReferralCode(share.referralCode)
      setExpiresAt(share.expiresAt)
      trackProductEvent('consult_visit_share_created', { mode, has_referral: Boolean(share.referralCode) }, { patientId })
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Falha ao gerar link')
      setShareUrl(null)
      setReferralCode(null)
      setExpiresAt(null)
    } finally {
      setShareLoading(false)
    }
  }, [patientId, mode])

  useEffect(() => {
    if (!open || !patientId) return
    setShowQr(false)
    void refreshShare()
  }, [open, patientId, mode, refreshShare])

  useEffect(() => {
    if (!open || !patientId) return
    setPrintLoading(true)
    api.patients
      .clinicalExport(patientId, mode)
      .then(setExportData)
      .catch(() => setExportData(null))
      .finally(() => setPrintLoading(false))
  }, [open, patientId, mode])

  const activeContext = exportData?.context ?? context ?? null

  const handleCopyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      // Headless / permissão negada — link segue disponível via QR e e-mail
    }
    message.success(CLINICAL_EXPORT_COPY.shareCopied)
    trackProductEvent('consult_visit_link_copied', { mode }, { patientId })
  }

  const handlePrint = () => {
    if (!sheetRef.current || !activeContext) return
    const title = `${CLINICAL_EXPORT_COPY.title} — ${activeContext.identity.name}`
    printClinicalExportSheet(sheetRef.current, title)
    trackProductEvent('consult_visit_print', { mode }, { patientId })
  }

  const handleWhatsapp = () => {
    if (!shareUrl) return
    const name = patientName ?? activeContext?.identity.name ?? 'paciente'
    const text = `Olá! Resumo de saúde de ${name} para nossa consulta:\n${shareUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
    trackProductEvent('consult_visit_whatsapp', { mode }, { patientId })
  }

  const handleOpenPreview = () => {
    requestClinicalExportOpen({ patientId, mode })
    onClose()
  }

  const handleEmailDoctor = async () => {
    const email = doctorEmail.trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      message.warning('Informe um e-mail válido do médico')
      return
    }
    setEmailLoading(true)
    try {
      const result = await api.patients.emailClinicalExportShare(patientId, {
        recipientEmail: email,
        doctorName: doctorName.trim() || undefined,
        mode,
        ttlHours: 48,
      })
      setShareUrl(result.shareUrl)
      setReferralCode(result.referralCode)
      setExpiresAt(result.expiresAt)
      message.success(
        result.emailSent ? CLINICAL_EXPORT_COPY.consultVisitEmailSent : CLINICAL_EXPORT_COPY.consultVisitEmailQueued,
      )
      trackProductEvent(
        'consult_visit_email_sent',
        { mode, email_skipped: result.emailSkipped },
        { patientId },
      )
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Falha ao enviar e-mail')
    } finally {
      setEmailLoading(false)
    }
  }

  const expiresLabel = expiresAt
    ? new Date(expiresAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : null

  return (
    <Modal
      open={open}
      title={CLINICAL_EXPORT_COPY.consultVisitTitle}
      onCancel={onClose}
      width={520}
      footer={[
        <Button key="close" onClick={onClose}>{CLINICAL_EXPORT_COPY.closeButton}</Button>,
      ]}
      destroyOnClose
    >
      <Paragraph type="secondary" style={{ marginTop: 0 }}>
        {CLINICAL_EXPORT_COPY.consultVisitSubtitle}
        {patientName ? ` — ${patientName}` : ''}
      </Paragraph>

      <Radio.Group
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        style={{ width: '100%', marginBottom: 16 }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Radio value="summary">
            <Text strong>{CLINICAL_EXPORT_COPY.consultVisitModeSummary}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {CLINICAL_EXPORT_COPY.consultVisitModeSummaryHint}
            </Text>
          </Radio>
          <Radio value="full">
            <Text strong>{CLINICAL_EXPORT_COPY.consultVisitModeFull}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {CLINICAL_EXPORT_COPY.consultVisitModeFullHint}
            </Text>
          </Radio>
        </Space>
      </Radio.Group>

      {shareLoading && <Alert type="info" message="Gerando link seguro…" showIcon style={{ marginBottom: 16 }} />}

      {expiresLabel && !shareLoading && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
          {CLINICAL_EXPORT_COPY.consultVisitExpires} {expiresLabel}
        </Text>
      )}

      {referralCode && !shareLoading && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <>
              {CLINICAL_EXPORT_COPY.consultVisitReferralHint}
              <br />
              <Text strong>{CLINICAL_EXPORT_COPY.consultVisitReferralCode} {referralCode}</Text>
            </>
          }
        />
      )}

      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Button
          block
          size="large"
          type="primary"
          icon={<LinkOutlined />}
          loading={shareLoading}
          disabled={!shareUrl}
          onClick={handleCopyLink}
        >
          {CLINICAL_EXPORT_COPY.consultVisitCopyLink}
        </Button>

        <Button
          block
          icon={<QrcodeOutlined />}
          disabled={!shareUrl || shareLoading}
          onClick={() => setShowQr((v) => !v)}
        >
          {CLINICAL_EXPORT_COPY.consultVisitShowQr}
        </Button>

        {showQr && shareUrl && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <QRCode value={shareUrl} size={200} errorLevel="M" />
            <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
              {CLINICAL_EXPORT_COPY.consultVisitQrHint}
            </Paragraph>
          </div>
        )}

        <Button
          block
          icon={<PrinterOutlined />}
          loading={printLoading}
          disabled={!activeContext}
          onClick={handlePrint}
        >
          {CLINICAL_EXPORT_COPY.consultVisitPrint}
        </Button>

        <Button
          block
          icon={<WhatsAppOutlined />}
          disabled={!shareUrl || shareLoading}
          onClick={handleWhatsapp}
        >
          {CLINICAL_EXPORT_COPY.consultVisitWhatsapp}
        </Button>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {CLINICAL_EXPORT_COPY.consultVisitWhatsappHint}
        </Text>

        <Divider style={{ margin: '8px 0' }} />

        <Text strong>{CLINICAL_EXPORT_COPY.consultVisitEmailTitle}</Text>
        <Input
          type="email"
          placeholder="medico@clinica.com.br"
          value={doctorEmail}
          onChange={(e) => setDoctorEmail(e.target.value)}
          disabled={shareLoading}
        />
        <Input
          placeholder="Dr. Silva"
          value={doctorName}
          onChange={(e) => setDoctorName(e.target.value)}
          disabled={shareLoading}
          aria-label={CLINICAL_EXPORT_COPY.consultVisitDoctorNameLabel}
        />
        <Button
          block
          icon={<MailOutlined />}
          loading={emailLoading}
          disabled={shareLoading || !doctorEmail.trim()}
          onClick={handleEmailDoctor}
        >
          {CLINICAL_EXPORT_COPY.consultVisitEmailSend}
        </Button>

        <Button type="link" block onClick={handleOpenPreview} style={{ padding: 0 }}>
          {CLINICAL_EXPORT_COPY.consultVisitPreview}
        </Button>
      </Space>

      {activeContext && (
        <div ref={sheetRef} style={{ position: 'absolute', left: -9999, top: 0, width: 720 }}>
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
