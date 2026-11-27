/**
 * Galeria dev — paridade PAT compact × Canvas (S0 expandido ↔ S3 recolhido).
 * Viewport alvo: 390×844 (iPhone).
 */
import { useEffect, useRef, useState } from 'react'
import { Card, Segmented, Tag, Typography } from 'antd'
import { PATIENT_COMPACT_MACRO_ICONS } from '../../components/patient/patient-compact-macro-icons.js'
import { useTranslation } from 'react-i18next'
import type { PatientSection, PatientTabKey } from '../../lib/patient-navigation.js'
import { SECTION_TABS } from '../../lib/patient-navigation.js'
import { PatientCompactMacroSections } from '../../components/patient/PatientCompactMacroSections.js'
import { PatientCompactSubTabs } from '../../components/patient/PatientCompactSubTabs.js'
import { PatientCompactPersonContextBar } from '../../components/patient/PatientCompactPersonContextBar.js'
import { PatientCompactProfileHero } from '../../components/patient/PatientCompactProfileHero.js'
import { useCompactPatientChrome } from '../../contexts/CompactPatientChromeContext.js'
import {
  DESIGN_PATIENT_BRUNO,
  DESIGN_PATIENT_FAMILY,
} from '../../fixtures/design-patient-chrome.js'
import '../../components/patient/patient-detail-nav.css'
import './design-preview-frame.css'

const { Title, Text } = Typography

const CHROME_COLLAPSED = 0.85
const CHROME_EXPANDED = 0
const SCROLL_CHROME_RANGE = 152

type ChromePreset = 'expanded' | 'collapsed' | 'auto'

function VaccineFixtureRow({
  name,
  meta,
  pill,
  ok,
}: {
  name: string
  meta: string
  pill: string
  ok: boolean
}) {
  return (
    <div className="design-preview-vaccine-row">
      <div>
        <Text strong style={{ display: 'block', fontSize: 14 }}>
          {name}
        </Text>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {meta}
        </Text>
      </div>
      <Tag color={ok ? 'success' : 'warning'}>{pill}</Tag>
    </div>
  )
}

function BadgeSpacer({ small }: { small?: boolean }) {
  return <div style={{ height: small ? 8 : 12 }} />
}

export function DesignPatientChromePreview() {
  const { t } = useTranslation()
  const { progress, setChrome } = useCompactPatientChrome()
  const heroSentinelRef = useRef<HTMLDivElement>(null)
  const initialPreset = (): ChromePreset => {
    const q = new URLSearchParams(window.location.search).get('chrome')
    if (q === 'expanded' || q === 'collapsed' || q === 'auto') return q
    return 'collapsed'
  }
  const [preset, setPreset] = useState<ChromePreset>(initialPreset)
  const [activeSection, setActiveSection] = useState<PatientSection>('clinical')
  const [activeTab, setActiveTab] = useState<PatientTabKey>('growth')
  const sectionTabKeys = SECTION_TABS[activeSection]
  const macroLabelsOnly = progress > 0.62

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
      const eased = raw * raw * (3 - 2 * raw)
      setChrome({ progress: eased, patientFocus: true })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [preset, setChrome])

  const macroCompactItems = (['overview', 'clinical', 'plan', 'files'] as PatientSection[]).map((section) => ({
    section,
    label: t(`sections.${section}`),
    icon: PATIENT_COMPACT_MACRO_ICONS[section],
  }))

  const tabTextLabel = (key: PatientTabKey) => {
    const labels: Partial<Record<PatientTabKey, string>> = {
      growth: 'Resumo',
      vaccines: 'Vacinas',
      medications: 'Medicações',
      allergies: 'Alergias',
      exams: 'Exames',
      records: 'Prontuário',
      authorizations: 'Autorizações',
      diagnoses: 'Diagnósticos',
    }
    return labels[key] ?? t(`patient.tabs.${key}`, { defaultValue: key })
  }

  return (
    <div className="design-patient-chrome-preview" data-testid="design-patient-chrome-preview">
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
          p={progress.toFixed(2)}
        </Text>
      </div>

      <div ref={heroSentinelRef}>
        <PatientCompactProfileHero
          patient={DESIGN_PATIENT_BRUNO}
          age="8 anos"
          onBack={() => undefined}
          showActions={false}
        />
      </div>

      <PatientCompactPersonContextBar
        patient={DESIGN_PATIENT_BRUNO}
        patients={DESIGN_PATIENT_FAMILY}
        heroSentinelRef={heroSentinelRef}
      />

      <Card
        style={{ borderRadius: 16, overflow: 'visible', marginTop: 8 }}
        styles={{ body: { padding: 0, overflow: 'visible' } }}
      >
        <div className="patient-detail-sticky-nav">
          <PatientCompactMacroSections
            activeSection={activeSection}
            items={macroCompactItems}
            onChange={setActiveSection}
            labelsOnly={macroLabelsOnly}
          />
          <PatientCompactSubTabs
            activeKey={activeTab}
            items={sectionTabKeys.map((key) => ({ key, label: tabTextLabel(key) }))}
            onChange={(key) => setActiveTab(key as PatientTabKey)}
            sectionLabel={t(`sections.${activeSection}`)}
          />
        </div>
        <div className="patient-tab-body--compact" style={{ padding: 16 }}>
          <Title level={5} style={{ margin: 0, fontSize: 15 }}>
            Resumo do histórico
          </Title>
          <BadgeSpacer />
          <VaccineFixtureRow name="Hepatite B" meta="3ª dose · ago/2024" pill="Em dia" ok />
          <BadgeSpacer small />
          <VaccineFixtureRow name="Tríplice viral (SCR)" meta="Última dose há 9 anos" pill="Verificar" ok={false} />
          {preset === 'auto' ? (
            <>
              <BadgeSpacer />
              <Text type="secondary" style={{ fontSize: 13 }}>
                Role para ver transição expandido → recolhido (parallax hero / lockup / macro).
              </Text>
              <div className="design-preview-scroll-spacer" aria-hidden />
            </>
          ) : null}
        </div>
      </Card>
    </div>
  )
}