/**
 * Corpo PAT compact (hero + rail macro/B+ + Resumo) — paridade patient/detail × Canvas v7.2.
 */
import { useRef, useState, type CSSProperties } from 'react'
import { Card, Tag, Typography } from 'antd'
import { PATIENT_COMPACT_MACRO_ICONS } from '../../components/patient/patient-compact-macro-icons.js'
import { useTranslation } from 'react-i18next'
import type { PatientSection, PatientTabKey } from '../../lib/patient-navigation.js'
import { SECTION_TABS } from '../../lib/patient-navigation.js'
import { PatientCompactMacroSections } from '../../components/patient/PatientCompactMacroSections.js'
import { PatientCompactSubTabs } from '../../components/patient/PatientCompactSubTabs.js'
import { PatientCompactPersonContextBar } from '../../components/patient/PatientCompactPersonContextBar.js'
import { PatientCompactProfileHero } from '../../components/patient/PatientCompactProfileHero.js'
import {
  chromeHeaderPhase,
  chromeMacroCompactLeftIcon,
  chromeMacroPhase,
} from '../../lib/patient-chrome-phases.js'
import {
  DESIGN_CLINICAL_HISTORY_ROWS,
  DESIGN_PATIENT_BRUNO,
  DESIGN_PATIENT_FAMILY,
} from '../../fixtures/design-patient-chrome.js'

const { Title, Text } = Typography

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

export type DesignPatientChromePreviewContentProps = {
  chromeP: number
  /** Rolagem extra no preset Auto (só rota interativa). */
  showScrollSpacer?: boolean
  className?: string
  'data-testid'?: string
}

export function DesignPatientChromePreviewContent({
  chromeP,
  showScrollSpacer = false,
  className,
  'data-testid': testId = 'design-patient-chrome-preview',
}: DesignPatientChromePreviewContentProps) {
  const { t } = useTranslation()
  const heroSentinelRef = useRef<HTMLDivElement>(null)
  const [activeSection, setActiveSection] = useState<PatientSection>('clinical')
  const [activeTab, setActiveTab] = useState<PatientTabKey>('growth')
  const sectionTabKeys = SECTION_TABS[activeSection]
  const macroCompactLeftIcon = chromeMacroCompactLeftIcon(chromeP)

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

  const phaseStyle = {
    '--patient-chrome-p': chromeP,
    '--patient-chrome-p-macro': chromeMacroPhase(chromeP),
    '--patient-chrome-p-header': chromeHeaderPhase(chromeP),
  } as CSSProperties

  return (
    <div
      className={className ?? 'design-patient-chrome-preview'}
      data-testid={testId}
      style={phaseStyle}
    >
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
        className="design-patient-chrome-card"
        style={{ borderRadius: 16, overflow: 'visible', marginTop: 8 }}
        styles={{ body: { padding: 0, overflow: 'visible' } }}
      >
        <div className="patient-detail-sticky-nav" data-testid="design-patient-chrome-rail">
          <PatientCompactMacroSections
            activeSection={activeSection}
            items={macroCompactItems}
            onChange={setActiveSection}
            compactLeftIcon={macroCompactLeftIcon}
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
          {DESIGN_CLINICAL_HISTORY_ROWS.map((row, index) => (
            <div key={row.name}>
              {index > 0 ? <BadgeSpacer small /> : null}
              <VaccineFixtureRow name={row.name} meta={row.meta} pill={row.pill} ok={row.ok} />
            </div>
          ))}
          <div className="design-preview-bottom-nav-scroll-pad" aria-hidden />
          {showScrollSpacer ? (
            <>
              <BadgeSpacer />
              <Text type="secondary" style={{ fontSize: 13 }}>
                Role para ver transição expandido → recolhido (fases p-macro / p-header).
              </Text>
              <div className="design-preview-scroll-spacer" aria-hidden />
            </>
          ) : null}
        </div>
      </Card>
    </div>
  )
}
