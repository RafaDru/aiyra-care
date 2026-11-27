/**
 * Galeria dev — paridade PAT compact × Canvas S3.
 * Viewport alvo: 390×844 (iPhone). Abra DevTools → device toolbar 390px ou a rota já limita largura.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Card, Tag, Typography } from 'antd'
import { MedicineBoxOutlined, UserOutlined, IdcardOutlined, FolderOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { PatientSection, PatientTabKey } from '../../lib/patient-navigation.js'
import { SECTION_TABS } from '../../lib/patient-navigation.js'
import { PatientCompactMacroSections } from '../../components/patient/PatientCompactMacroSections.js'
import { PatientCompactSubTabs } from '../../components/patient/PatientCompactSubTabs.js'
import { PatientCompactPersonContextBar } from '../../components/patient/PatientCompactPersonContextBar.js'
import { useCompactPatientChrome } from '../../contexts/CompactPatientChromeContext.js'
import {
  DESIGN_PATIENT_BRUNO,
  DESIGN_PATIENT_FAMILY,
} from '../../fixtures/design-patient-chrome.js'
import '../../components/patient/patient-detail-nav.css'

const { Title, Text } = Typography

/** S3 no espelho Canvas ≈ 0,85 de progresso de chrome. */
const CHROME_S3_PROGRESS = 0.85

const SECTION_ICONS: Record<PatientSection, ReactNode> = {
  overview: <UserOutlined />,
  clinical: <MedicineBoxOutlined />,
  plan: <IdcardOutlined />,
  files: <FolderOutlined />,
}

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

export function DesignPatientChromePreview() {
  const { t } = useTranslation()
  const { setChrome } = useCompactPatientChrome()
  const heroSentinelRef = useRef<HTMLDivElement>(null)
  const [activeSection, setActiveSection] = useState<PatientSection>('clinical')
  const [activeTab, setActiveTab] = useState<PatientTabKey>('growth')
  const sectionTabKeys = SECTION_TABS[activeSection]
  const macroLabelsOnly = CHROME_S3_PROGRESS > 0.62

  useEffect(() => {
    setChrome({ progress: CHROME_S3_PROGRESS, patientFocus: true })
  }, [setChrome])

  const macroCompactItems = (['overview', 'clinical', 'plan', 'files'] as PatientSection[]).map((section) => ({
    section,
    label: t(`sections.${section}`),
    icon: SECTION_ICONS[section],
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
      <div className="design-patient-chrome-preview__hero-sentinel" ref={heroSentinelRef} aria-hidden />
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
        </div>
      </Card>
    </div>
  )
}

function BadgeSpacer({ small }: { small?: boolean }) {
  return <div style={{ height: small ? 8 : 12 }} />
}