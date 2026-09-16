import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Alert, Button, Spin, Typography } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'
import type { PatientClinicalExport } from '../lib/api.types.js'
import { PatientClinicalExportSheet, printClinicalExportSheet } from '../components/patient/PatientClinicalExportSheet.js'
import { ClinicianShareFeedback } from '../components/clinician/ClinicianShareFeedback.js'
import { CLINICAL_EXPORT_COPY } from '../components/patient/clinical-export-copy.js'
import { trackClinicianShareEvent } from '../lib/clinician-share-events.js'
import './clinical-export-share.css'

const BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'http://127.0.0.1:3010')

const { Text, Title, Paragraph } = Typography

function formatPatientAge(ageYears: number): string {
  if (ageYears < 1) return `${Math.max(1, Math.round(ageYears * 12))} meses`
  return `${Math.floor(ageYears)} anos`
}

function genderLabel(gender: string | null | undefined): string | null {
  if (gender === 'male') return 'masculino'
  if (gender === 'female') return 'feminino'
  return gender ?? null
}

export function ClinicalExportSharePage() {
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const [data, setData] = useState<PatientClinicalExport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setError('Link inválido')
      setLoading(false)
      return
    }
    const ref = searchParams.get('ref')
    const query = ref ? `?ref=${encodeURIComponent(ref)}` : ''
    fetch(`${BASE_URL}/clinical-export/share/${encodeURIComponent(token)}${query}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { message?: string }
          throw new Error(body.message ?? 'Link expirado ou inválido')
        }
        return res.json() as Promise<PatientClinicalExport>
      })
      .then((payload) => {
        setData(payload)
        trackClinicianShareEvent('clinician_share_viewed', {
          mode: payload.mode,
          has_referral: Boolean(ref),
        })
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Falha ao carregar'))
      .finally(() => setLoading(false))
  }, [token, searchParams])

  if (loading) {
    return (
      <div className="clinician-share-page" style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error || !data?.context) {
    return (
      <div className="clinician-share-page">
        <div style={{ maxWidth: 480, margin: '48px auto', padding: 24 }}>
          <Alert type="error" message={error ?? 'Resumo não encontrado'} showIcon />
        </div>
      </div>
    )
  }

  const identity = data.context.identity
  const gender = genderLabel(identity.gender)
  const modeLabel = data.mode === 'full'
    ? CLINICAL_EXPORT_COPY.clinicianPortalModeFull
    : CLINICAL_EXPORT_COPY.clinicianPortalModeSummary

  const handlePrint = () => {
    const el = document.getElementById('clinical-export-share-sheet')
    if (!el) return
    printClinicalExportSheet(el, `${CLINICAL_EXPORT_COPY.title} — ${identity.name}`)
  }

  const handleCtaClick = () => {
    trackClinicianShareEvent('clinician_share_cta_click', {
      mode: data.mode,
      cta_target: 'landing_home',
    })
  }

  return (
    <div className="clinician-share-page">
      <header className="clinician-share-topbar">
        <div className="clinician-share-topbar__brand">
          <p className="clinician-share-topbar__title">{CLINICAL_EXPORT_COPY.clinicianPortalTitle}</p>
          <p className="clinician-share-topbar__subtitle">{CLINICAL_EXPORT_COPY.clinicianPortalSubtitle}</p>
        </div>
        <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
          {CLINICAL_EXPORT_COPY.printButton}
        </Button>
      </header>

      <main className="clinician-share-body">
        <Alert
          type="info"
          showIcon
          message={CLINICAL_EXPORT_COPY.clinicianPortalDisclaimer}
          style={{ marginBottom: 16 }}
        />

        <section className="clinician-share-patient-card">
          <Title level={3} style={{ margin: 0 }}>{identity.name}</Title>
          <p className="clinician-share-patient-meta">
            {formatPatientAge(identity.ageYears)}
            {gender ? ` · ${gender}` : ''}
            {identity.bloodType ? ` · tipo sanguíneo ${identity.bloodType}` : ''}
          </p>
          <p className="clinician-share-patient-meta" style={{ fontSize: 12, marginTop: 4 }}>
            Nascimento: {new Date(identity.birthDate).toLocaleDateString('pt-BR')}
          </p>
          <span className="clinician-share-mode-tag">{modeLabel}</span>
        </section>

        <div className="clinician-share-sheet-wrap" id="clinical-export-share-sheet">
          <PatientClinicalExportSheet
            context={data.context}
            mode={data.mode}
            fullSections={data.fullSections}
          />
        </div>

        <footer className="clinician-share-footer">
          <ClinicianShareFeedback mode={data.mode} />

          <div className="clinician-share-cta">
            <Title level={5} style={{ marginBottom: 4 }}>{CLINICAL_EXPORT_COPY.clinicianPortalCtaTitle}</Title>
            <Paragraph type="secondary" style={{ marginBottom: 12 }}>
              {CLINICAL_EXPORT_COPY.clinicianPortalCtaBody}
            </Paragraph>
            <Link to="/home" onClick={handleCtaClick}>
              <Button type="default">{CLINICAL_EXPORT_COPY.clinicianPortalCtaButton}</Button>
            </Link>
          </div>

          <Text type="secondary" style={{ textAlign: 'center', fontSize: 12 }}>
            {CLINICAL_EXPORT_COPY.footerDisclaimer}
          </Text>
        </footer>
      </main>
    </div>
  )
}
