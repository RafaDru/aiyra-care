/**
 * Galeria dev — S0 | S3 lado a lado (paridade Canvas dual / compare).
 */
import { useEffect } from 'react'
import { Typography } from 'antd'
import { useCompactPatientChrome } from '../../contexts/CompactPatientChromeContext.js'
import { DesignPatientChromePreviewContent } from './patient-chrome-preview-content.js'
import '../../components/patient/patient-detail-nav.css'
import './design-preview-frame.css'

const { Title, Text } = Typography

const S0 = 0
const S3 = 0.85

export function DesignPatientChromeCompare() {
  const { setChrome } = useCompactPatientChrome()

  useEffect(() => {
    setChrome({ patientFocus: true, progress: S3 })
  }, [setChrome])

  return (
    <div className="design-patient-chrome-compare" data-testid="design-patient-chrome-compare">
      <div className="design-patient-chrome-compare__intro">
        <Title level={5} style={{ margin: 0 }}>
          Expandido × Recolhido (fixtures)
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Mesmo stack v7.2: header AppLayout + rail sticky + Resumo. CSS vars locais por coluna.
        </Text>
      </div>
      <div className="design-patient-chrome-compare__grid">
        <div className="design-patient-chrome-compare__col">
          <Text strong className="design-patient-chrome-compare__label">
            S0 · p={S0.toFixed(2)}
          </Text>
          <DesignPatientChromePreviewContent
            chromeP={S0}
            data-testid="design-patient-chrome-column-s0"
          />
        </div>
        <div className="design-patient-chrome-compare__col">
          <Text strong className="design-patient-chrome-compare__label">
            S3 · p={S3.toFixed(2)}
          </Text>
          <DesignPatientChromePreviewContent
            chromeP={S3}
            data-testid="design-patient-chrome-column-s3"
          />
        </div>
      </div>
    </div>
  )
}