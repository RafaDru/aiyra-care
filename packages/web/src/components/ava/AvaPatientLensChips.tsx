import { Avatar, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import type { Patient } from '../../lib/api.types.js'

interface Props {
  patients: Patient[]
  value: string
  onChange: (patientId: string) => void
  disabled?: boolean
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

/** Chips de lente de paciente — alternativa leve ao dropdown (V0). */
export function AvaPatientLensChips({ patients, value, onChange, disabled }: Props) {
  const { t } = useTranslation()

  if (patients.length <= 1) {
    const p = patients[0]
    if (!p) return null
    return (
      <span className="ava-patient-lens-chips__solo">
        {p.name}
        {p.isSelf && (
          <Tag color="purple" style={{ marginLeft: 6, fontSize: 10, lineHeight: 18 }}>
            {t('patient.you')}
          </Tag>
        )}
      </span>
    )
  }

  return (
    <div className="ava-patient-lens-chips" role="listbox" aria-label={t('ava.patientLensLabel')}>
      {patients.map((p) => {
        const active = p.id === value
        return (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            className={['ava-patient-lens-chip', active && 'ava-patient-lens-chip--active'].filter(Boolean).join(' ')}
            onClick={() => onChange(p.id)}
            aria-selected={active}
          >
            <Avatar
              size={22}
              src={p.photoUrl ?? undefined}
              style={{
                backgroundColor: p.gender === 'female' ? '#EC4899' : '#4F46E5',
                fontSize: 10,
                flexShrink: 0,
              }}
            >
              {initials(p.name)}
            </Avatar>
            <span className="ava-patient-lens-chip__name">{p.name}</span>
            {p.isSelf && (
              <Tag color="purple" className="ava-patient-lens-chip__you">
                {t('patient.you')}
              </Tag>
            )}
          </button>
        )
      })}
    </div>
  )
}
