import { useMemo } from 'react'
import { Text, View, StyleSheet, useWindowDimensions } from 'react-native'
import Svg, { Circle, Line, Polyline } from 'react-native-svg'
import type { WhoGrowthPayload } from '@/lib/api.types'
import { buildWhoChartRows } from '@/lib/who-growth-rows'
import { CHART_PAD, chartInnerSize, computeYDomain, polylinePoints, scaleLinear } from '@/lib/chart-scale'
import type { AiyraThemeTokens } from '@/theme/useAiyraTheme'

const CHART_HEIGHT = 220

type Props = {
  payload: WhoGrowthPayload
  title: string
  tokens: AiyraThemeTokens
  whoLabels: { p3: string; p50: string; p97: string }
  lastPercentileText?: string
  locale: string
}

export function WhoGrowthLineChart({ payload, title, tokens, whoLabels, lastPercentileText, locale }: Props) {
  const { width: windowWidth } = useWindowDimensions()
  const width = Math.min(windowWidth - 32, 480)
  const { innerW, innerH } = chartInnerSize(width, CHART_HEIGHT)

  const layout = useMemo(() => {
    const rows = buildWhoChartRows(payload)
    if (rows.length === 0) return null

    const xMin = 0
    const xMax = Math.max(...rows.map((r) => r.ageMonths), 1)
    const yValues: number[] = []
    for (const r of rows) {
      if (r.p3 != null) yValues.push(r.p3)
      if (r.p50 != null) yValues.push(r.p50)
      if (r.p97 != null) yValues.push(r.p97)
      if (r.value != null) yValues.push(r.value)
    }
    const { yMin, yMax } = computeYDomain(yValues)

    const mapX = (ageMonths: number) =>
      scaleLinear(ageMonths, xMin, xMax, CHART_PAD.left, CHART_PAD.left + innerW)
    const mapY = (v: number) =>
      scaleLinear(v, yMin, yMax, CHART_PAD.top + innerH, CHART_PAD.top)

    const refRows = payload.referenceCurve
    const line = (key: 'p3' | 'p50' | 'p97') => {
      const coords = refRows
        .map((r) => ({ x: mapX(r.ageMonths), y: mapY(r[key]) }))
        .filter((c) => Number.isFinite(c.y))
      return polylinePoints(coords)
    }

    const patientCoords = payload.patientPoints
      .slice()
      .sort((a, b) => a.ageMonths - b.ageMonths)
      .map((p) => ({ x: mapX(p.ageMonths), y: mapY(p.value) }))

    return { line, patientCoords, yMin, yMax, xMax }
  }, [payload, innerW, innerH])

  if (!layout) return null

  const last = payload.patientPoints[payload.patientPoints.length - 1]

  return (
    <View style={styles.wrap}>
      <Text style={{ color: tokens.colorTextSecondary, fontSize: 13, marginBottom: 4 }}>
        {title} ({payload.unit})
      </Text>
      <Svg width={width} height={CHART_HEIGHT}>
        <Line
          x1={CHART_PAD.left}
          y1={CHART_PAD.top + innerH}
          x2={CHART_PAD.left + innerW}
          y2={CHART_PAD.top + innerH}
          stroke={tokens.colorBorder}
          strokeWidth={1}
        />
        <Polyline points={layout.line('p97')} fill="none" stroke="#d9d9d9" strokeWidth={1} strokeDasharray="4 4" />
        <Polyline points={layout.line('p50')} fill="none" stroke="#bfbfbf" strokeWidth={1} strokeDasharray="2 2" />
        <Polyline points={layout.line('p3')} fill="none" stroke="#d9d9d9" strokeWidth={1} strokeDasharray="4 4" />
        {layout.patientCoords.length > 0 ? (
          <Polyline
            points={polylinePoints(layout.patientCoords)}
            fill="none"
            stroke="#1677ff"
            strokeWidth={2.5}
          />
        ) : null}
        {layout.patientCoords.map((c, i) => (
          <Circle key={i} cx={c.x} cy={c.y} r={4} fill="#1677ff" stroke="#fff" strokeWidth={1} />
        ))}
      </Svg>
      <View style={styles.legend}>
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 10 }}>{whoLabels.p3}</Text>
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 10 }}>{whoLabels.p50}</Text>
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 10 }}>{whoLabels.p97}</Text>
      </View>
      {last && lastPercentileText ? (
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 11, marginTop: 4 }}>
          {lastPercentileText}
        </Text>
      ) : null}
      <Text style={{ position: 'absolute', left: 4, top: CHART_PAD.top - 2, fontSize: 10, color: tokens.colorTextSecondary }}>
        {layout.yMax.toLocaleString(locale, { maximumFractionDigits: 1 })}
      </Text>
      <Text
        style={{
          position: 'absolute',
          left: 4,
          bottom: CHART_PAD.bottom - 2,
          fontSize: 10,
          color: tokens.colorTextSecondary,
        }}
      >
        {layout.yMin.toLocaleString(locale, { maximumFractionDigits: 1 })}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', marginBottom: 8 },
  legend: { flexDirection: 'row', gap: 12, marginTop: 2 },
})
