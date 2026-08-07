import { useMemo } from 'react'
import { Alert, Empty, Spin, Typography } from 'antd'
import type { Vaccine, VaccineScheduleItem } from '../../lib/api.types.js'
import { VaccineAlphabeticalList } from './VaccineAlphabeticalList.js'
import { VaccineScheduleCarousel } from './VaccineScheduleCarousel.js'
import {
  buildAlphabeticalGroups,
  buildTimelineView,
  buildVaccinePeriodView,
} from './vaccine-view-utils.js'

const { Text } = Typography

interface Props {
  applied: Vaccine[]
  schedule: VaccineScheduleItem[]
  birthDate?: string | null
  loading?: boolean
  onEditVaccine?: (vaccineId: string) => void
}

export function VaccineDashboard({ applied, schedule, birthDate, loading, onEditVaccine }: Props) {
  const view = useMemo(
    () => buildVaccinePeriodView(applied, schedule, birthDate),
    [applied, schedule, birthDate],
  )

  const alphabeticalGroups = useMemo(() => buildAlphabeticalGroups(view), [view])
  const timeline = useMemo(() => buildTimelineView(view, birthDate), [view, birthDate])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (applied.length === 0 && schedule.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Nenhuma vacina registrada. Importe da Caderneta ou ConecteSUS, ou registre manualmente."
      />
    )
  }

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          Calendário PNI com linha do tempo por idade e detalhamento por vacina.
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {view.conferredSlots} de {view.totalCatalogSlots} doses conferidas
          {view.multiSourceConfirmations > 0 && (
            <> · {view.multiSourceConfirmations} com múltiplas fontes</>
          )}
        </Text>
      </div>

      {(view.counts.overdue > 0 || view.counts.current > 0) && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {view.counts.overdue > 0 && (
            <Text style={{ color: '#ff4d4f', fontSize: 13 }}>{view.counts.overdue} atrasada(s)</Text>
          )}
          {view.counts.current > 0 && (
            <Text style={{ color: '#fa8c16', fontSize: 13 }}>{view.counts.current} no período</Text>
          )}
          {view.counts.future > 0 && (
            <Text type="secondary" style={{ fontSize: 13 }}>{view.counts.future} futura(s)</Text>
          )}
          <Text style={{ color: '#52c41a', fontSize: 13 }}>{view.counts.applied} aplicada(s)</Text>
        </div>
      )}

      {view.counts.overdue > 0 && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 20 }}
          message={`${view.counts.overdue} dose(s) atrasada(s) no calendário`}
        />
      )}

      <div
        style={{
          marginBottom: 28,
          padding: 16,
          borderRadius: 16,
          background: 'linear-gradient(180deg, #FAF8FF 0%, #FFFFFF 100%)',
          border: '1px solid var(--border, #E2E8F0)',
          boxShadow: '0 2px 12px rgba(107, 70, 193, 0.06)',
        }}
      >
        <VaccineScheduleCarousel timeline={timeline} birthDate={birthDate} />
      </div>

      {alphabeticalGroups.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Nenhuma dose no calendário para exibir."
        />
      ) : (
        <VaccineAlphabeticalList groups={alphabeticalGroups} onEditVaccine={onEditVaccine} />
      )}
    </div>
  )
}
