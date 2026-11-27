/**
 * Dev — duas colunas 390px: rótulo mock (Canvas) × preview PAT live.
 */
import { useMemo } from 'react'
import { Card, Segmented, Tag, Typography } from 'antd'
import { useSearchParams } from 'react-router-dom'
import { DesignPatientChromePreview } from './patient-chrome-preview.js'
import './design-patient-chrome-compare.css'

const { Text, Title } = Typography

const CANVAS_MIRROR_URL =
  'https://cursor.com/canvas/store-1b70afcc-bd73-4856-b0a0-08659a158546/5ced97c4-0aad-4d7b-8b79-798357008230'

type CompareChrome = 'expanded' | 'collapsed'

export function DesignPatientChromeCompare() {
  const [searchParams, setSearchParams] = useSearchParams()
  const chrome = useMemo((): CompareChrome => {
    const q = searchParams.get('chrome')
    return q === 'collapsed' ? 'collapsed' : 'expanded'
  }, [searchParams])

  const setChrome = (next: CompareChrome) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('chrome', next)
    setSearchParams(nextParams, { replace: true })
  }

  return (
    <div className="design-patient-chrome-compare" data-testid="design-patient-chrome-compare">
      <div className="design-patient-chrome-compare__toolbar" role="toolbar" aria-label="Comparar chrome">
        <Segmented
          size="small"
          value={chrome}
          onChange={(v) => setChrome(v as CompareChrome)}
          options={[
            { label: 'Expandido (S0)', value: 'expanded' },
            { label: 'Recolhido (S3)', value: 'collapsed' },
          ]}
        />
        <Text type="secondary" className="design-patient-chrome-compare__hint">
          Sincroniza com ?chrome= · 390×844
        </Text>
      </div>

      <div className="design-patient-chrome-compare__cols">
        <div className="design-patient-chrome-compare__col">
          <Tag color="magenta">Canvas (conceito)</Tag>
          <Card size="small" className="design-patient-chrome-compare__mock-card">
            <Title level={5} style={{ marginTop: 0, fontSize: 14 }}>
              Espelho no Cursor Canvas
            </Title>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
              Abra o modo <strong>Comparar lado a lado</strong> no Canvas ao lado deste split.
            </Text>
            <a href={CANVAS_MIRROR_URL} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
              Abrir espelho 5ced97c4
            </a>
            <div
              className="design-patient-chrome-compare__mock-frame"
              aria-hidden
              data-chrome={chrome}
            >
              <Text type="secondary" style={{ fontSize: 11, textAlign: 'center', padding: 12 }}>
                Mock {chrome === 'expanded' ? 'S0 expandido' : 'S3 recolhido'}
              </Text>
            </div>
          </Card>
        </div>

        <div className="design-patient-chrome-compare__col">
          <Tag color="purple">Código real (v6)</Tag>
          <div className="design-patient-chrome-compare__live">
            <DesignPatientChromePreview />
          </div>
        </div>
      </div>
    </div>
  )
}