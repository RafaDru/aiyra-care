import { useMemo } from 'react'
import { Text, View, StyleSheet, useWindowDimensions } from 'react-native'
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg'
import type { MeasurementChartSeries } from '@/lib/api.types'
import { CHART_PAD, chartInnerSize, computeYDomain, polylinePoints, scaleLinear } from '@/lib/chart-scale'
import type { AiyraThemeTokens } from '@/theme/useAiyraTheme'

const CHART_HEIGHT = 200

function formatAxisDate(iso: string, locale: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short' })
}

type Props = {
  series: MeasurementChartSeries
  title: string
  systolicLabel?: string
  diastolicLabel?: string
  tokens: AiyraThemeTokens
  locale: string
}

export function MeasurementSeriesLineChart({
  series,
  title,
  systolicLabel = 'Sistólica',
  diastolicLabel = 'Diastólica',
  tokens,
  locale,
}: Props) {
  const { width: windowWidth } = useWindowDimensions()
  const width = Math.min(windowWidth - 32, 480)
  const { innerW, innerH } = chartInnerSize(width, CHART_HEIGHT)

  const sorted = useMemo(
    () =>
      [...series.points]
        .filter((p) => p.value != null || p.valueSecondary != null)
        .sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime()),
    [series.points],
  )

  const isBp =
    series.typeCode === 'blood_pressure' &&
    (series.chartConfig.chartKind === 'dual-line' || series.valueKind === 'dual')

  const layout = useMemo(() => {
    if (sorted.length === 0) return null
    const yValues: number[] = []
    for (const p of sorted) {
      if (p.value != null) yValues.push(p.value)
      if (p.valueSecondary != null) yValues.push(p.valueSecondary)
    }
    const range = series.normalRange
    if (range?.min != null) yValues.push(range.min)
    if (range?.max != null) yValues.push(range.max)
    const { yMin, yMax } = computeYDomain(yValues)

    const mapX = (i: number) =>
      sorted.length === 1
        ? CHART_PAD.left + innerW / 2
        : CHART_PAD.left + (i / (sorted.length - 1)) * innerW
    const mapY = (v: number) => scaleLinear(v, yMin, yMax, CHART_PAD.top + innerH, CHART_PAD.top)

    const primary = sorted
      .map((p, i) => (p.value != null ? { x: mapX(i), y: mapY(p.value) } : null))
      .filter((c): c is { x: number; y: number } => c != null)

    const secondary = sorted
      .map((p, i) => (p.valueSecondary != null ? { x: mapX(i), y: mapY(p.valueSecondary) } : null))
      .filter((c): c is { x: number; y: number } => c != null)

    let refRect: { y: number; h: number } | null = null
    if (range?.min != null && range?.max != null) {
      const yTop = mapY(range.max)
      const yBottom = mapY(range.min)
      refRect = { y: Math.min(yTop, yBottom), h: Math.abs(yBottom - yTop) }
    }

    return { primary, secondary, yMin, yMax, refRect, firstLabel: formatAxisDate(sorted[0].observedAt, locale), lastLabel: formatAxisDate(sorted[sorted.length - 1].observedAt, locale) }
  }, [sorted, series.normalRange, innerW, innerH, locale])

  if (!layout) {
    return (
      <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>
        {title} — sem pontos no período
      </Text>
    )
  }

  const color = (series.chartConfig.color as string | undefined) ?? '#1677ff'
  const sysColor = series.chartConfig.components?.[0]?.color ?? '#cf1322'
  const diaColor = series.chartConfig.components?.[1]?.color ?? '#1677ff'

  return (
    <View style={styles.wrap}>
      <Text style={{ color: tokens.colorTextBase, fontWeight: '600', fontSize: 15 }}>
        {title}
        {series.unit ? ` (${series.unit})` : ''}
      </Text>
      <Svg width={width} height={CHART_HEIGHT}>
        {layout.refRect ? (
          <Rect
            x={CHART_PAD.left}
            y={layout.refRect.y}
            width={innerW}
            height={layout.refRect.h}
            fill="rgba(82, 196, 26, 0.12)"
          />
        ) : null}
        <Line
          x1={CHART_PAD.left}
          y1={CHART_PAD.top + innerH}
          x2={CHART_PAD.left + innerW}
          y2={CHART_PAD.top + innerH}
          stroke={tokens.colorBorder}
          strokeWidth={1}
        />
        {isBp && layout.secondary.length > 0 ? (
          <Polyline points={polylinePoints(layout.secondary)} fill="none" stroke={diaColor} strokeWidth={2} />
        ) : null}
        {layout.primary.length > 0 ? (
          <Polyline
            points={polylinePoints(layout.primary)}
            fill="none"
            stroke={isBp ? sysColor : color}
            strokeWidth={2.5}
          />
        ) : null}
        {layout.primary.map((c, i) => (
          <Circle key={`p-${i}`} cx={c.x} cy={c.y} r={3.5} fill={isBp ? sysColor : color} />
        ))}
        {isBp
          ? layout.secondary.map((c, i) => (
              <Circle key={`s-${i}`} cx={c.x} cy={c.y} r={3.5} fill={diaColor} />
            ))
          : null}
      </Svg>
      <View style={styles.xLabels}>
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 10 }}>{layout.firstLabel}</Text>
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 10 }}>{layout.lastLabel}</Text>
      </View>
      {isBp ? (
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 11 }}>
          {systolicLabel} / {diastolicLabel}
        </Text>
      ) : null}
      <Text style={{ position: 'absolute', left: 4, top: CHART_PAD.top, fontSize: 10, color: tokens.colorTextSecondary }}>
        {layout.yMax.toLocaleString(locale, { maximumFractionDigits: 1 })}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', marginBottom: 16, gap: 4 },
  xLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: CHART_PAD.left },
})
