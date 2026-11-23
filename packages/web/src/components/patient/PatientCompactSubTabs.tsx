import type { ReactNode } from 'react'
import type { PatientTabKey } from '../../lib/patient-navigation.js'

export type PatientCompactSubTabItem = {
  key: PatientTabKey
  label: ReactNode
}

interface Props {
  activeKey: string
  items: PatientCompactSubTabItem[]
  onChange: (key: string) => void
}

/**
 * Navegação de sub-abas em shell compacto (PWA / ≤768px).
 * Grade de chips com quebra de linha — sem carrossel horizontal nem truncamento.
 */
export function PatientCompactSubTabs({ activeKey, items, onChange }: Props) {
  return (
    <div className="patient-sub-tabs-compact" role="tablist" data-testid="patient-sub-tabs-compact">
      {items.map((item) => {
        const selected = activeKey === item.key
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={selected}
            className={`patient-sub-tabs-compact__chip${selected ? ' patient-sub-tabs-compact__chip--active' : ''}`}
            onClick={() => onChange(item.key)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}