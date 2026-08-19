import { useState } from 'react'
import { Button, Tooltip } from 'antd'
import {
  FullscreenOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { MeasurementChartSeries } from './measurement-chart.types.js'
import { MeasurementChartRenderer } from './MeasurementChartRenderer.js'
import { MeasurementChartFullscreenHost } from './MeasurementChartFullscreenHost.js'
import {
  computeSeriesTrend,
  formatMeasurementValue,
} from './measurement-chart.utils.js'

type Props = {
  series: MeasurementChartSeries
  onOpenExam?: (examId: string) => void
  chartHeight?: number
}

export function MeasurementChartCard({ series, onOpenExam, chartHeight = 200 }: Props) {
  const { t } = useTranslation()
  const [fullscreen, setFullscreen] = useState(false)
  const label = t(series.labelKey)
  const trend = computeSeriesTrend(series)
  const count = series.points.filter((p) => p.value != null).length

  const trendIcon =
    trend.direction === 'up'
      ? <ArrowUpOutlined className="measurement-chart-trend--up" />
      : trend.direction === 'down'
        ? <ArrowDownOutlined className="measurement-chart-trend--down" />
        : trend.direction === 'flat'
          ? <MinusOutlined className="measurement-chart-trend--flat" />
          : null

  const trendText =
    trend.delta != null && trend.previous != null
      ? t('measurement.trendDelta', {
          delta: trend.delta > 0 ? `+${trend.delta.toFixed(1)}` : trend.delta.toFixed(1),
        })
      : null

  return (
    <>
      <article className="measurement-chart-card">
        <div className="measurement-chart-card__header">
          <div>
            <div className="measurement-chart-card__title">{label}</div>
            <div className="measurement-chart-card__last">
              {formatMeasurementValue(trend.last, series.unit)}
              {trendIcon && (
                <span style={{ marginLeft: 8, fontSize: 14 }}>{trendIcon}</span>
              )}
            </div>
            <div className="measurement-chart-card__meta">
              {t('measurement.pointCount', { count })}
              {trendText && ` · ${trendText}`}
            </div>
          </div>
          <div className="measurement-chart-card__actions">
            <Tooltip title={t('measurement.fullscreen')}>
              <Button
                type="text"
                size="small"
                icon={<FullscreenOutlined />}
                onClick={() => setFullscreen(true)}
                aria-label={t('measurement.fullscreen')}
              />
            </Tooltip>
          </div>
        </div>
        <MeasurementChartRenderer
          mode="single"
          series={series}
          height={chartHeight}
          onOpenExam={onOpenExam}
        />
      </article>

      <MeasurementChartFullscreenHost
        open={fullscreen}
        title={label}
        subtitle={series.unit ? `${series.unit} · ${t('measurement.pointCount', { count })}` : undefined}
        onClose={() => setFullscreen(false)}
      >
        <MeasurementChartRenderer
          mode="single"
          series={series}
          height="100%"
          onOpenExam={onOpenExam}
        />
      </MeasurementChartFullscreenHost>
    </>
  )
}
