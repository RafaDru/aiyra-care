export const CHART_PAD = { left: 44, right: 16, top: 12, bottom: 28 }

export function chartInnerSize(width: number, height: number) {
  return {
    innerW: width - CHART_PAD.left - CHART_PAD.right,
    innerH: height - CHART_PAD.top - CHART_PAD.bottom,
  }
}

export function computeYDomain(values: number[], padRatio = 0.12): { yMin: number; yMax: number } {
  if (values.length === 0) return { yMin: 0, yMax: 1 }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = (max - min) * padRatio || max * 0.1 || 1
  return { yMin: Math.max(0, min - pad), yMax: max + pad }
}

export function scaleLinear(
  value: number,
  domainMin: number,
  domainMax: number,
  pixelMin: number,
  pixelMax: number,
): number {
  const span = domainMax - domainMin || 1
  const t = (value - domainMin) / span
  return pixelMin + t * (pixelMax - pixelMin)
}

export function polylinePoints(
  coords: Array<{ x: number; y: number }>,
): string {
  return coords.map((c) => `${c.x},${c.y}`).join(' ')
}
