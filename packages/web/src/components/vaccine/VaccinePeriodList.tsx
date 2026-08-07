import { Typography } from 'antd'
import type { VaccinePeriodGroup, VaccineDoseRow } from './vaccine-view-utils.js'
import { DOSE_STATUS_COLOR } from './vaccine-display-helpers.js'

const { Text } = Typography

interface Props {
  group: VaccinePeriodGroup
}

function DoseRow({
  row,
  showSeriesLink,
  isLastInSeries,
}: {
  row: VaccineDoseRow
  showSeriesLink: boolean
  isLastInSeries: boolean
}) {
  const color = DOSE_STATUS_COLOR[row.visualStatus]

  return (
    <div style={{ display: 'flex', gap: 12, minHeight: 48 }}>
      {/* Coluna da linha do tempo / sequência */}
      <div style={{ width: 20, flexShrink: 0, position: 'relative' }}>
        {showSeriesLink && (
          <div
            style={{
              position: 'absolute',
              left: 9,
              top: row.linkFromAbove ? -20 : -8,
              bottom: isLastInSeries ? '50%' : -8,
              width: 2,
              background: '#d9d9d9',
            }}
          />
        )}
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: color,
            border: '2px solid #fff',
            boxShadow: '0 0 0 1px ' + color,
            marginTop: 6,
            position: 'relative',
            zIndex: 1,
          }}
        />
      </div>

      {/* Conteúdo */}
      <div
        style={{
          flex: 1,
          paddingBottom: 16,
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 10px' }}>
          <Text strong style={{ fontSize: 15, color: color === '#bfbfbf' ? '#8c8c8c' : 'inherit' }}>
            {row.displayName}
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>{row.doseLabel}</Text>
        </div>
        <Text style={{ fontSize: 13, display: 'block', marginTop: 4, color }}>
          {row.primaryLine}
        </Text>
        {row.secondaryLine && (
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
            {row.secondaryLine}
          </Text>
        )}
        {row.confirmationLine && (
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
            {row.confirmationLine}
            {row.batch ? ` · Lote ${row.batch}` : ''}
          </Text>
        )}
      </div>
    </div>
  )
}

/** Detecta sequências (mesma vacina, múltiplas doses) para ligação visual. */
function annotateSeries(rows: VaccineDoseRow[]): Array<{ row: VaccineDoseRow; showLink: boolean; isLastInSeries: boolean }> {
  const result: Array<{ row: VaccineDoseRow; showLink: boolean; lastInSeries: boolean }> = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const prev = rows[i - 1]
    const next = rows[i + 1]
    const samePrev = prev?.seriesKey === row.seriesKey
    const sameNext = next?.seriesKey === row.seriesKey
    result.push({
      row,
      showLink: Boolean(row.linkFromAbove) || samePrev || sameNext,
      lastInSeries: !sameNext,
    })
  }
  return result
}

export function VaccinePeriodSection({ group }: Props) {
  const annotated = annotateSeries(group.rows)

  return (
    <section style={{ marginBottom: 28 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <Text strong style={{ fontSize: 14, whiteSpace: 'nowrap' }}>
          {group.periodLabel}
        </Text>
        <div style={{ flex: 1, height: 1, background: '#e8e8e8' }} />
      </div>
      <div style={{ paddingLeft: 4 }}>
        {annotated.map(({ row, showLink, lastInSeries }) => (
          <DoseRow
            key={row.id}
            row={row}
            showSeriesLink={showLink}
            isLastInSeries={lastInSeries}
          />
        ))}
      </div>
    </section>
  )
}
