import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MenuOutlined } from '@ant-design/icons'
import { Drawer, List } from 'antd'
import { useTranslation } from 'react-i18next'
import type { PatientTabKey } from '../../lib/patient-navigation.js'

export type PatientCompactSubTabItem = {
  key: PatientTabKey
  label: ReactNode
}

interface Props {
  activeKey: string
  items: PatientCompactSubTabItem[]
  onChange: (key: string) => void
  /** Título da macro (ex. Histórico clínico) — cabeçalho da lista completa */
  sectionLabel?: string
}

/**
 * Sub-abas compactas PAT-2b: menu ☰ (lista completa) + carrossel horizontal com peek,
 * labels completos, altura alinhada (44px), seleção fidel + underline.
 */
export function PatientCompactSubTabs({ activeKey, items, onChange, sectionLabel }: Props) {
  const { t } = useTranslation()
  const [sheetOpen, setSheetOpen] = useState(false)
  const railRef = useRef<HTMLDivElement>(null)
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  useEffect(() => {
    const el = chipRefs.current.get(activeKey)
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [activeKey, items.length])

  const sheetTitle =
    sectionLabel != null && sectionLabel !== ''
      ? t('patient.compactSubNavSheetTitle', { section: sectionLabel, defaultValue: '{{section}} — seções' })
      : t('patient.compactSubNavSheetTitleGeneric', { defaultValue: 'Seções' })

  const pick = (key: string) => {
    onChange(key)
    setSheetOpen(false)
  }

  return (
  <>
    <div className="patient-sub-tabs-bplus" data-testid="patient-sub-tabs-compact">
      <button
        type="button"
        className="patient-sub-tabs-bplus__menu"
        aria-label={t('patient.compactSubNavMenu', { defaultValue: 'Ver todas as seções' })}
        aria-expanded={sheetOpen}
        data-testid="patient-sub-tabs-menu"
        onClick={() => setSheetOpen(true)}
      >
        <MenuOutlined />
      </button>
      <div className="patient-sub-tabs-bplus__rail-wrap">
        <div ref={railRef} className="patient-sub-tabs-bplus__rail" role="tablist">
          {items.map((item) => {
            const selected = activeKey === item.key
            return (
              <button
                key={item.key}
                ref={(node) => {
                  if (node) chipRefs.current.set(item.key, node)
                  else chipRefs.current.delete(item.key)
                }}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`patient-sub-tabs-bplus__chip${selected ? ' patient-sub-tabs-bplus__chip--active' : ''}`}
                onClick={() => onChange(item.key)}
              >
                <span className="patient-sub-tabs-bplus__chip-label">{item.label}</span>
              </button>
            )
          })}
        </div>
        <div className="patient-sub-tabs-bplus__peek-fade" aria-hidden />
      </div>
    </div>

    <Drawer
      title={sheetTitle}
      placement="bottom"
      open={sheetOpen}
      onClose={() => setSheetOpen(false)}
      height="auto"
      className="patient-sub-tabs-bplus__sheet"
      styles={{ body: { padding: '8px 0 16px', maxHeight: 'min(70vh, 420px)' } }}
    >
      <List
        dataSource={items}
        renderItem={(item) => {
          const selected = activeKey === item.key
          return (
            <List.Item
              className={`patient-sub-tabs-bplus__sheet-item${selected ? ' patient-sub-tabs-bplus__sheet-item--active' : ''}`}
              onClick={() => pick(item.key)}
              style={{ cursor: 'pointer' }}
            >
              {item.label}
            </List.Item>
          )
        }}
      />
    </Drawer>
  </>
  )
}