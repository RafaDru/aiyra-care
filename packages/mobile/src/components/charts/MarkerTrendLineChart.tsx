import { useMemo } from 'react'
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native'
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg'
import type { MarkerTrendGroup } from '@/lib/api.types'
import type { AiyraThemeTokens } from '@/theme/useAiyraTheme'

const CHART_HEIGHT = 200
const PAD = { left: 44, right: 16, top: 12, bottom: 28 }

function statusColor(status: string): string {
  if (status === 'critical') return '#cf1322'
  if (status === 'altered') return '#d48806'
  return '#389e0d'
}

type Props = {
  group: MarkerTrendGroup
  tokens: AiyraThemeTokens
  locale: string
}

export function MarkerTrendLineChart({ group, tokens, locale }: Props) {
  const { width: windowWidth } = useWindowDimensions()
  const width = Math.min(windowWidth - 32, 480)
  const innerW = width - PAD.left - PAD.right
  const innerH = CHART_HEIGHT - PAD.top - PAD.bottom

  const points = useMemo(
    () => group.points.filter((p) => p.numericValue != null),
    [group.points],
  )

  const layout = useMemo(() => {
    if (points.length === 0) return null
    const values = points.map((p) => p.numericValue as number)
    if (group.refLow != null) values.push(group.refLow)
    if (group.refHigh != null) values.push(group.refHigh)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const pad = (max - min) * 0.15 || max * 0.1 || 1
    const yMin = Math.max(0, min - pad)
    const yMax = max + pad
    const ySpan = yMax - yMin || 1

    const coords = points.map((p, i) => {
      const x =
        points.length === 1
          ? PAD.left + innerW / 2
          : PAD.left + (i / (points.length - 1)) * innerW
      const y = PAD.top + innerH - (((p.numericValue as number) - yMin) / ySpan) * innerH
      return { x, y, point: p }
    })

    const poly = coords.map((c) => `${c.x},${c.y}`).join(' ')

    let refRect: { y: number; h: number } | null = null
    if (group.refLow != null || group.refHigh != null) {
      const low = group.refLow ?? yMin
      const high = group.refHigh ?? yMax
      const yTop = PAD.top + innerH - ((high - yMin) / ySpan) * innerH
      const yBottom = PAD.top + innerH - ((low - yMin) / ySpan) * innerH
      refRect = { y: Math.min(yTop, yBottom), h: Math.abs(yBottom - yTop) }
    }

    const yTicks = [yMin, yMax]
    return { coords, poly, yMin, yMax, refRect, yTicks }
  }, [points, group.refLow, group.refHigh, innerW, innerH])

  if (!layout || points.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 14 }}>
          Sem valores numéricos para gráfico.
        </Text>
      </View>
    )
  }

  const lineColor = statusColor(group.latestStatus)

  return (
    <View style={styles.wrap}>
      <Svg width={width} height={CHART_HEIGHT}>
        {layout.refRect ? (
          <Rect
            x={PAD.left}
            y={layout.refRect.y}
            width={innerW}
            height={layout.refRect.h}
            fill="rgba(82, 196, 26, 0.12)"
          />
        ) : null}
        <Line
          x1={PAD.left}
          y1={PAD.top + innerH}
          x2={PAD.left + innerW}
          y2={PAD.top + innerH}
          stroke={tokens.colorBorder}
          strokeWidth={1}
        />
        <Polyline points={layout.poly} fill="none" stroke={lineColor} strokeWidth={2.5} />
        {layout.coords.map((c, idx) => (
          <Circle
            key={`${c.point.examId}-${idx}`}
            cx={c.x}
            cy={c.y}
            r={4}
            fill={statusColor(c.point.status)}
            stroke="#fff"
            strokeWidth={1}
          />
        ))}
      </Svg>
      <View style={[styles.yLabels, { height: CHART_HEIGHT }]}>
        <Text style={[styles.tick, { color: tokens.colorTextSecondary, top: PAD.top - 4 }]}>
          {formatTick(layout.yMax, locale)}
        </Text>
        <Text
          style={[styles.tick, { color: tokens.colorTextSecondary, bottom: PAD.bottom - 4 }]}
        >
          {formatTick(layout.yMin, locale)}
        </Text>
      </View>
      {group.unit ? (
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 12, marginTop: 4 }}>
          {group.unit}
          {group.referenceRange ? ` · ref. ${group.referenceRange}` : ''}
        </Text>
      ) : null}
    </View>
  )
}

function formatTick(value: number, locale: string): string {
  if (value >= 1000 || (value > 0 && value < 0.01)) {
    return value.toExponential(1)
  }
  return value.toLocaleString(locale, { maximumFractionDigits: 2 })
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  empty: { paddingVertical: 24, alignItems: 'center' },
  yLabels: { position: 'absolute', left: 0, width: PAD.left - 4, top: 0 },
  tick: { position: 'absolute', right: 4, fontSize: 10 },
})
