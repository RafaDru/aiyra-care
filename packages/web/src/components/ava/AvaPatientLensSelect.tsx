import { Select, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import type { Patient } from '../../lib/api.types.js'

interface Props {
  patients: Patient[]
  value: string
  onChange: (patientId: string) => void
  /** Rota fixa a um paciente — seletor ainda permite override com aviso visual. */
  routePatientId?: string | null
  disabled?: boolean
}

export function AvaPatientLensSelect({
  patients,
  value,
  onChange,
  routePatientId,
  disabled,
}: Props) {
  const { t } = useTranslation()

  return (
    <Select
      size="small"
      value={value}
      disabled={disabled || patients.length <= 1}
      onChange={onChange}
      popupMatchSelectWidth={false}
      style={{ minWidth: 160, maxWidth: 220 }}
      options={patients.map((p) => ({
        value: p.id,
        label: (
          <span>
            {p.name}
            {p.isSelf && (
              <Tag color="purple" style={{ marginLeft: 6, fontSize: 10, lineHeight: 18 }}>
                {t('patient.you')}
              </Tag>
            )}
          </span>
        ),
      }))}
      aria-label={t('ava.patientLensLabel')}
    />
  )
}
