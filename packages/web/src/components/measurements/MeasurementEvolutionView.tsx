import { useMemo, useState } from 'react'
import { Button, Card, Empty, Select, Tag, Typography } from 'antd'
import { FullscreenOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { MeasurementChartSeries } from './measurement-chart.types.js'
import { MeasurementChartCard } from './MeasurementChartCard.js'
import { MeasurementChartRenderer } from './MeasurementChartRenderer.js'
import { MeasurementChartFullscreenHost } from './MeasurementChartFullscreenHost.js'
import {
  MEASUREMENT_COMPARE_PRESETS,
  MAX_COMPARE_SERIES,
} from './measurement-chart-presets.js'
import './measurement-charts.css'

type Props = {
  patientId: string
  series: MeasurementChartSeries[]
  labSeries?: MeasurementChartSeries[]
  loading?: boolean
  onImportGlucose?: () => void
  importingGlucose?: boolean
}

export function MeasurementEvolutionView({
  patientId,
  series,
  labSeries,
  loading,
  onImportGlucose,
  importingGlucose,
}: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [customTypes, setCustomTypes] = useState<string[]>([])
  const [compareFullscreen, setCompareFullscreen] = useState(false)

  const vitalSeries = useMemo(
    () => series.filter((s) => s.category === 'vital_sign'),
    [series],
  )
  const lab = labSeries ?? series.filter((s) => s.category === 'lab_point')
  const allForPick = useMemo(() => [...vitalSeries, ...lab], [vitalSeries, lab])

  const openExam = (examId: string) => {
    navigate(`/patients/${patientId}?tab=exams&highlight=${examId}`)
  }

  const compareSeries = useMemo(() => {
    if (activePreset) {
      const preset = MEASUREMENT_COMPARE_PRESETS.find((p) => p.id === activePreset)
      if (!preset) return []
      return allForPick.filter((s) => preset.typeCodes.includes(s.typeCode))
    }
    if (customTypes.length) {
      return allForPick.filter((s) => customTypes.includes(s.typeCode))
    }
    return []
  }, [activePreset, customTypes, allForPick])

  const compareTitle = useMemo(() => {
    if (!compareSeries.length) return ''
    return compareSeries.map((s) => t(s.labelKey)).join(' + ')
  }, [compareSeries, t])

  const selectOptions = allForPick.map((s) => ({
    value: s.typeCode,
    label: t(s.labelKey),
  }))

  const onPresetClick = (presetId: string) => {
    setCustomTypes([])
    setActivePreset((prev) => (prev === presetId ? null : presetId))
  }

  const onCustomChange = (values: string[]) => {
    setActivePreset(null)
    setCustomTypes(values.slice(0, MAX_COMPARE_SERIES))
  }

  if (!loading && vitalSeries.length === 0 && lab.length === 0) {
    return (
      <Empty
        description={t('measurement.noChartData')}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    )
  }

  return (
    <div className="measurement-evolution-root">
      {lab.length > 0 && onImportGlucose && (
        <div style={{ marginBottom: 16 }}>
          <Button loading={importingGlucose} onClick={onImportGlucose}>
            {t('measurement.importGlucose')}
          </Button>
          <Typography.Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
            {t('measurement.ocrAutoHint')}
          </Typography.Text>
        </div>
      )}

      {allForPick.length >= 2 && (
        <section className="measurement-evolution-section">
          <div className="measurement-evolution-section__title">
            {t('measurement.compareSection')}
          </div>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 13 }}>
            {t('measurement.compareIntro')}
          </Typography.Paragraph>

          <div className="measurement-compare-bar">
            {MEASUREMENT_COMPARE_PRESETS.map((preset) => {
              const available = preset.typeCodes.every((code) =>
                allForPick.some((s) => s.typeCode === code),
              )
              if (!available) return null
              const active = activePreset === preset.id
              return (
                <Tag
                  key={preset.id}
                  className="measurement-compare-chip"
                  color={active ? 'blue' : 'default'}
                  onClick={() => onPresetClick(preset.id)}
                >
                  {t(preset.labelKey)}
                </Tag>
              )
            })}
            <Select
              mode="multiple"
              allowClear
              placeholder={t('measurement.compareCustom')}
              style={{ minWidth: 220 }}
              maxCount={MAX_COMPARE_SERIES}
              value={customTypes}
              onChange={onCustomChange}
              options={selectOptions}
            />
            {compareSeries.length > 0 && (
              <Button
                icon={<FullscreenOutlined />}
                onClick={() => setCompareFullscreen(true)}
              >
                {t('measurement.fullscreen')}
              </Button>
            )}
          </div>

          {compareSeries.length > 0 ? (
            <Card size="small" styles={{ body: { padding: '16px 12px 8px' } }}>
              <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                {compareTitle}
              </Typography.Text>
              <MeasurementChartRenderer
                mode="compare"
                seriesList={compareSeries}
                height={280}
                onOpenExam={openExam}
              />
            </Card>
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {t('measurement.comparePickHint')}
            </Typography.Text>
          )}
        </section>
      )}

      {vitalSeries.length > 0 && (
        <section className="measurement-evolution-section">
          <div className="measurement-evolution-section__title">
            {t('measurement.vitalsSection')}
          </div>
          <div
            style={{
              display: 'grid',
              gap: 16,
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            }}
          >
            {vitalSeries.map((s) => (
              <MeasurementChartCard
                key={s.typeCode}
                series={s}
                onOpenExam={openExam}
              />
            ))}
          </div>
        </section>
      )}

      {lab.length > 0 && (
        <section className="measurement-evolution-section">
          <div className="measurement-evolution-section__title">
            {t('measurement.labSection')}
          </div>
          <div
            style={{
              display: 'grid',
              gap: 16,
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            }}
          >
            {lab.map((s) => (
              <MeasurementChartCard
                key={s.typeCode}
                series={s}
                onOpenExam={openExam}
              />
            ))}
          </div>
        </section>
      )}

      <MeasurementChartFullscreenHost
        open={compareFullscreen && compareSeries.length > 0}
        title={t('measurement.compareFullscreenTitle')}
        subtitle={compareTitle}
        onClose={() => setCompareFullscreen(false)}
      >
        {compareSeries.length > 0 && (
          <MeasurementChartRenderer
            mode="compare"
            seriesList={compareSeries}
            height="100%"
            onOpenExam={openExam}
          />
        )}
      </MeasurementChartFullscreenHost>
    </div>
  )
}
