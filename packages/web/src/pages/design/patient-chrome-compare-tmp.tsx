/**
 * Galeria dev — paridade PAT compact × Canvas (S0 expandido ↔ S3 recolhido).
 * Viewport alvo: 390×844 (iPhone).
 */
import { useEffect, useState } from 'react'
import { Segmented, Typography } from 'antd'
import { useCompactPatientChrome } from '../../contexts/CompactPatientChromeContext.js'
import { DESIGN_PATIENT_CHROME_PATH } from '../../lib/design-preview-env.js'
import { DesignPatientChromePreviewContent } from './patient-chrome-preview-content.js'
import '../../components/patient/patient-detail-nav.css'
import './design-preview-frame.css'

const { Text } = Typography

const CHROME_COLLAPSED = 0.85
const CHROME_EXPANDED = 0
const SCROLL_CHROME_RANGE = 152

type ChromePreset = 'expanded' | 'collapsed' | 'auto'

function easeChrome(raw: number): number {
  const c = Math.max(0, Math.min(1, raw))
  return c * c * (3 - 2 * c)
}

export function DesignPatientChromePreview() {
  const { progress, setChrome } = useCompactPatientChrome()
  const initialPreset = (): ChromePreset => {
    const q = new URLSearchParams(window.location.search).get('chrome')
    if (q === 'expanded' || q === 'collapsed' || q === 'auto') return q
    return 'auto'
  }
  const [preset, setPreset] = useState<ChromePreset>(initialPreset)

  useEffect(() => {
    setChrome({ patientFocus: true })
  }, [setChrome])

  useEffect(() => {
    if (preset === 'expanded') {
      setChrome({ progress: CHROME_EXPANDED, patientFocus: true })
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
      return
    }
    if (preset === 'collapsed') {
      setChrome({ progress: CHROME_COLLAPSED, patientFocus: true })
      return
    }
    const onScroll = () => {
      const raw = Math.min(1, Math.max(0, window.scrollY / SCROLL_CHROME_RANGE))
      setChrome({ progress: easeChrome(raw), patientFocus: true })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [preset, setChrome])

  return (
    <div className="design-patient-chrome-route" data-design-path={DESIGN_PATIENT_CHROME_PATH}>
      <div className="design-chrome-preset-bar" role="toolbar" aria-label="Chrome PAT">
        <Segmented
          size="small"
          value={preset}
          onChange={(v) => setPreset(v as ChromePreset)}
          options={[
            { label: 'Expandido (S0)', value: 'expanded' },
            { label: 'Recolhido (S3)', value: 'collapsed' },
            { label: 'Auto (scroll)', value: 'auto' },
          ]}
        />
        <Text type="secondary" className="design-chrome-preset-bar__hint">
          p={progress.toFixed(2)} · ?chrome=auto
        </Text>
      </div>

      <DesignPatientChromePreviewContent chromeP={progress} showScrollSpacer={preset === 'auto'} />
    </div>
  )
}