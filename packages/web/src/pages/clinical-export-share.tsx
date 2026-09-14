import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Alert, Button, Spin, Typography } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'
import type { PatientClinicalExport } from '../lib/api.types.js'
import { PatientClinicalExportSheet, printClinicalExportSheet } from '../components/patient/PatientClinicalExportSheet.js'
import { CLINICAL_EXPORT_COPY } from '../components/patient/clinical-export-copy.js'

const BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'http://127.0.0.1:3010')

const { Title } = Typography

export function ClinicalExportSharePage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<PatientClinicalExport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!token) {
      setError('Link inválido')
      setLoading(false)
      return
    }
    fetch(`${BASE_URL}/clinical-export/share/${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { message?: string }
          throw new Error(body.message ?? 'Link expirado ou inválido')
        }
        return res.json() as Promise<PatientClinicalExport>
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Falha ao carregar'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error || !data?.context) {
    return (
      <div style={{ maxWidth: 480, margin: '48px auto', padding: 24 }}>
        <Alert type="error" message={error ?? 'Resumo não encontrado'} showIcon />
      </div>
    )
  }

  const handlePrint = () => {
    const el = document.getElementById('clinical-export-share-sheet')
    if (!el) return
    printClinicalExportSheet(el, `${CLINICAL_EXPORT_COPY.title} — ${data.context.identity.name}`)
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 48px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <Title level={4} style={{ margin: 0 }}>{CLINICAL_EXPORT_COPY.title}</Title>
        <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
          {CLINICAL_EXPORT_COPY.printButton}
        </Button>
      </div>
      <div id="clinical-export-share-sheet">
        <PatientClinicalExportSheet
          context={data.context}
          mode={data.mode}
          fullSections={data.fullSections}
        />
      </div>
    </div>
  )
}
