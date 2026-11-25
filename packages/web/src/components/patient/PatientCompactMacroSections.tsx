import type { ReactNode } from 'react'
import type { PatientSection } from '../../lib/patient-navigation.js'

export type PatientCompactMacroItem = {
  section: PatientSection
  label: string
  icon?: ReactNode
}

interface Props {
  activeSection: PatientSection
  items: PatientCompactMacroItem[]
  onChange: (section: PatientSection) => void
}

/**
 * Macro-seções do perfil no shell compacto (PAT-1): grade 2×2, rótulos completos.
 */
export function PatientCompactMacroSections({ activeSection, items, onChange }: Props) {
  return (
    <div
      className="patient-section-nav patient-section-nav--compact-grid"
      role="tablist"
      data-testid="patient-macro-sections-compact"
    >
      {items.map((item) => {
        const selected = activeSection === item.section
        return (
          <button
            key={item.section}
            type="button"
            role="tab"
            aria-selected={selected}
            className={`patient-macro-tile${selected ? ' patient-macro-tile--active' : ''}`}
            onClick={() => onChange(item.section)}
          >
            {item.icon ? <span className="patient-macro-tile__icon">{item.icon}</span> : null}
            <span className="patient-macro-tile__label">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}