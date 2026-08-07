import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const proposalsDir = join(__dirname, '../public/brand/proposals')
const brandDir = join(__dirname, '../public/brand')
const GRID = 256
const REDUCE_RATIO = 0.7
const STEP_KEEP = 1 - REDUCE_RATIO
const HALF_KEEP = 0.5
const KEEP_70 = 0.7
const SIZE_MULT_GROUPS = [12, 9, 6, 3]

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffledSizes(count, sizes, seed = 248071) {
  const perSize = Math.floor(count / sizes.length)
  const pool = sizes.flatMap((s) => Array(perSize).fill(s))
  while (pool.length < count) {
    pool.push(sizes[pool.length % sizes.length])
  }
  const rand = mulberry32(seed)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool
}

function subsampleEqually(cells, keepRatio) {
  if (keepRatio >= 1) return cells

  const pitch = Math.sqrt(1 / keepRatio)
  const buckets = new Map()

  for (const [gx, gy] of cells) {
    const bx = Math.floor(gx / pitch)
    const by = Math.floor(gy / pitch)
    const key = `${bx},${by}`
    const cx = bx * pitch + pitch / 2
    const cy = by * pitch + pitch / 2
    const dist = (gx - cx) ** 2 + (gy - cy) ** 2
    const prev = buckets.get(key)
    if (!prev || dist < prev.dist) {
      buckets.set(key, { cell: [gx, gy], dist })
    }
  }

  return Array.from(buckets.values())
    .map((v) => v.cell)
    .sort((a, b) => a[1] * GRID + a[0] - (b[1] * GRID + b[0]))
}

function subsampleByIndex(cells, keepRatio) {
  const target = Math.max(1, Math.round(cells.length * keepRatio))
  const sorted = [...cells].sort((a, b) => a[1] * GRID + a[0] - (b[1] * GRID + b[0]))
  if (target >= sorted.length) return sorted
  const out = []
  const step = (sorted.length - 1) / (target - 1)
  for (let k = 0; k < target; k++) {
    out.push(sorted[Math.round(k * step)])
  }
  return out
}

function heartRaw(t) {
  const x = 16 * Math.pow(Math.sin(t), 3)
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
  return [x, -y]
}

function buildHeartPolygon256() {
  const raw = []
  for (let i = 0; i < 512; i++) {
    raw.push(heartRaw((i / 512) * 2 * Math.PI))
  }
  const xs = raw.map((p) => p[0])
  const ys = raw.map((p) => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const pad = 28
  const target = GRID - pad * 2
  const scale = target / Math.max(maxX - minX, maxY - minY)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const ox = GRID / 2
  const oy = GRID / 2 + 8

  return raw.map(([x, y]) => [ox + (x - cx) * scale, oy + (y - cy) * scale])
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - x1, py - y1)
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq))
  const cx = x1 + t * dx
  const cy = y1 + t * dy
  return Math.hypot(px - cx, py - cy)
}

function distToPolygonEdge(gx, gy, polygon) {
  const px = gx + 0.5
  const py = gy + 0.5
  let min = Infinity
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length
    const d = distanceToSegment(
      px,
      py,
      polygon[i][0],
      polygon[i][1],
      polygon[j][0],
      polygon[j][1],
    )
    if (d < min) min = d
  }
  return min
}

function markExternalDots(dots, polygon, edgeFraction = 0.38) {
  for (const d of dots) {
    d.edgeDist = distToPolygonEdge(d.gx, d.gy, polygon)
  }
  const sorted = [...dots].sort((a, b) => a.edgeDist - b.edgeDist)
  const threshold = sorted[Math.floor(dots.length * edgeFraction)].edgeDist
  for (const d of dots) {
    d.external = d.edgeDist <= threshold
  }
}

function buildExternalLines(externalDots, maxDistGrid) {
  const lines = []
  for (let i = 0; i < externalDots.length; i++) {
    for (let j = i + 1; j < externalDots.length; j++) {
      const d = Math.hypot(
        externalDots[i].gx - externalDots[j].gx,
        externalDots[i].gy - externalDots[j].gy,
      )
      if (d <= maxDistGrid) lines.push([externalDots[i], externalDots[j]])
    }
  }
  return lines
}

function lineKey(a, b) {
  if (a.gx < b.gx || (a.gx === b.gx && a.gy <= b.gy)) {
    return `${a.gx},${a.gy}|${b.gx},${b.gy}`
  }
  return `${b.gx},${b.gy}|${a.gx},${a.gy}`
}

function mergeLines(...lineSets) {
  const seen = new Set()
  const out = []
  for (const lines of lineSets) {
    for (const pair of lines) {
      const key = lineKey(pair[0], pair[1])
      if (seen.has(key)) continue
      seen.add(key)
      out.push(pair)
    }
  }
  return out
}

function findBottomTip(dots) {
  const heartCx = GRID / 2
  return dots.reduce((best, d) => {
    if (!best) return d
    if (d.gy > best.gy) return d
    if (d.gy === best.gy && Math.abs(d.gx - heartCx) < Math.abs(best.gx - heartCx)) return d
    return best
  }, null)
}

/** Ângulo horário desde a vertical (para baixo) no espaço SVG (y cresce). */
function clockwiseFromDown(tip, other) {
  const dx = other.gx + 0.5 - (tip.gx + 0.5)
  const dy = other.gy + 0.5 - (tip.gy + 0.5)
  const angle = Math.atan2(dy, dx)
  const start = Math.PI / 2
  let rel = start - angle
  while (rel < 0) rel += 2 * Math.PI
  while (rel >= 2 * Math.PI) rel -= 2 * Math.PI
  return { rel, dist: Math.hypot(dx, dy) }
}

/** Ângulo anti-horário desde a vertical (para baixo) no espaço SVG (y cresce). */
function counterClockwiseFromDown(tip, other) {
  const dx = other.gx + 0.5 - (tip.gx + 0.5)
  const dy = other.gy + 0.5 - (tip.gy + 0.5)
  const angle = Math.atan2(dy, dx)
  const start = Math.PI / 2
  let rel = angle - start
  while (rel < 0) rel += 2 * Math.PI
  while (rel >= 2 * Math.PI) rel -= 2 * Math.PI
  return { rel, dist: Math.hypot(dx, dy) }
}

function firstSweepHit(tip, dots, sweepFn) {
  const others = dots.filter((d) => d !== tip)
  const ranked = others
    .map((d) => ({ d, ...sweepFn(tip, d) }))
    .filter((x) => x.dist > 0)
    .sort((a, b) => a.rel - b.rel || a.dist - b.dist)
  return ranked.length > 0 ? ranked[0].d : null
}

function center(d) {
  return { x: d.gx + 0.5, y: d.gy + 0.5 }
}

function cross(ax, ay, bx, by) {
  return ax * by - ay * bx
}

function segmentsCrossDots(a, b, c, d) {
  if (a === c || a === d || b === c || b === d) return false

  const pa = center(a)
  const pb = center(b)
  const pc = center(c)
  const pd = center(d)

  const abx = pb.x - pa.x
  const aby = pb.y - pa.y
  const acx = pc.x - pa.x
  const acy = pc.y - pa.y
  const adx = pd.x - pa.x
  const ady = pd.y - pa.y
  const cdx = pd.x - pc.x
  const cdy = pd.y - pc.y
  const cax = pa.x - pc.x
  const cay = pa.y - pc.y
  const cbx = pb.x - pc.x
  const cby = pb.y - pc.y

  const d1 = cross(acx, acy, abx, aby)
  const d2 = cross(adx, ady, abx, aby)
  const d3 = cross(cax, cay, cdx, cdy)
  const d4 = cross(cbx, cby, cdx, cdy)

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true
  }
  return false
}

function edgeCrossesAny(a, b, lines) {
  for (const [c, d] of lines) {
    if (segmentsCrossDots(a, b, c, d)) return true
  }
  return false
}

/** Liga pontos internos aos vizinhos mais próximos sem cruzar arestas existentes. */
function buildInternalLines(internalDots, allDots, baseLines, maxDist) {
  const existing = [...baseLines]
  const existingKeys = new Set(baseLines.map(([x, y]) => lineKey(x, y)))
  const candidates = []

  for (const a of internalDots) {
    for (const b of allDots) {
      if (a === b) continue
      const dist = Math.hypot(a.gx - b.gx, a.gy - b.gy)
      if (dist === 0 || dist > maxDist) continue
      const key = lineKey(a, b)
      if (existingKeys.has(key)) continue
      candidates.push({ a, b, dist, key })
    }
  }

  candidates.sort((x, y) => x.dist - y.dist)

  const added = []
  for (const { a, b, key } of candidates) {
    if (existingKeys.has(key)) continue
    if (edgeCrossesAny(a, b, existing)) continue
    const pair = [a, b]
    existing.push(pair)
    existingKeys.add(key)
    added.push(pair)
  }
  return added
}

/** Ponta inferior → primeiro ponto no sentido horário e anti-horário (para baixo). */
function buildTipSweepLines(tip, dots) {
  const cw = firstSweepHit(tip, dots, clockwiseFromDown)
  const ccw = firstSweepHit(tip, dots, counterClockwiseFromDown)
  const lines = []
  if (cw) lines.push([tip, cw])
  if (ccw && ccw !== cw) lines.push([tip, ccw])
  return lines
}

function fmt(n) {
  return Number(n.toFixed(3)).toString()
}

function pointInPolygon(x, y, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0]
    const yi = polygon[i][1]
    const xj = polygon[j][0]
    const yj = polygon[j][1]
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

const polygon = buildHeartPolygon256()
const allCells = []

for (let gy = 0; gy < GRID; gy++) {
  for (let gx = 0; gx < GRID; gx++) {
    const cx = gx + 0.5
    const cy = gy + 0.5
    if (pointInPolygon(cx, cy, polygon)) {
      allCells.push([gx, gy])
    }
  }
}

const step1 = subsampleEqually(allCells, STEP_KEEP)
const step2 = subsampleByIndex(step1, STEP_KEEP)
const step3 = subsampleByIndex(step2, HALF_KEEP)
const step4 = subsampleByIndex(step3, HALF_KEEP)
const step5 = subsampleByIndex(step4, KEEP_70)
const step6 = subsampleByIndex(step5, KEEP_70)
const cells = step6

const sizePool = shuffledSizes(cells.length, SIZE_MULT_GROUPS)
const dots = cells.map(([gx, gy], i) => ({
  gx,
  gy,
  mult: sizePool[i],
}))

markExternalDots(dots, polygon)

const externalDots = dots.filter((d) => d.external)
const internalDots = dots.filter((d) => !d.external)
const maxDistGrid = 22
const maxDistInternal = 20
const bottomTip = findBottomTip(dots)
const externalLines = buildExternalLines(externalDots, maxDistGrid)
const tipSweepLines = buildTipSweepLines(bottomTip, dots)
const baseLines = mergeLines(externalLines, tipSweepLines)
const internalLines = buildInternalLines(internalDots, dots, baseLines, maxDistInternal)
const allLines = mergeLines(baseLines, internalLines)

const BOX_W = 96
const BOX_H = 88
const SIDEBAR_BOX_W = 64
const SIDEBAR_BOX_H = 56
const SIDEBAR_PAD = 12
const SIDEBAR_GAP = 12
const STACKED_PAD_TOP = 20
const STACKED_PAD_X = 20
const STACKED_BOX_GAP = 16
const STACKED_WM_SIZE = 44
const STACKED_TAG_SIZE = 12
const HEART_IN_BOX = 0.9

function createBrandedGraphics(boxW, boxH) {
  const baseScale = boxW / GRID
  const heartScale = baseScale * HEART_IN_BOX

  function brandedMetrics(d) {
    return {
      cx: (d.gx + 0.5) * heartScale,
      cy: (d.gy + 0.5) * heartScale,
      r: (heartScale * 0.92 * d.mult) / 2,
    }
  }

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const d of dots) {
    const { cx, cy, r } = brandedMetrics(d)
    minX = Math.min(minX, cx - r)
    maxX = Math.max(maxX, cx + r)
    minY = Math.min(minY, cy - r)
    maxY = Math.max(maxY, cy + r)
  }

  const heartCx = (minX + maxX) / 2
  const heartCy = (minY + maxY) / 2
  const offset = {
    offsetX: boxW / 2 - heartCx,
    offsetY: boxH / 2 - heartCy,
  }

  const lineXml = allLines
    .map(([a, b]) => {
      const x1 = (a.gx + 0.5) * heartScale + offset.offsetX
      const y1 = (a.gy + 0.5) * heartScale + offset.offsetY
      const x2 = (b.gx + 0.5) * heartScale + offset.offsetX
      const y2 = (b.gy + 0.5) * heartScale + offset.offsetY
      return `<line x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}" />`
    })
    .join('\n')

  function circleXmlFor(theme) {
    return dots
      .map((d) => {
        const { cx, cy, r } = brandedMetrics(d)
        return `<circle cx="${fmt(cx + offset.offsetX)}" cy="${fmt(cy + offset.offsetY)}" r="${fmt(r)}" fill="${theme.network}" />`
      })
      .join('\n')
  }

  return { lineXml, circleXmlFor, offset }
}

function computeRawCenterOffset(dots) {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const d of dots) {
    const cx = d.gx + 0.5
    const cy = d.gy + 0.5
    const r = d.mult / 2
    minX = Math.min(minX, cx - r)
    maxX = Math.max(maxX, cx + r)
    minY = Math.min(minY, cy - r)
    maxY = Math.max(maxY, cy + r)
  }

  const heartCx = (minX + maxX) / 2
  const heartCy = (minY + maxY) / 2
  return {
    offsetX: GRID / 2 - heartCx,
    offsetY: GRID / 2 - heartCy,
  }
}

const branded = createBrandedGraphics(BOX_W, BOX_H)
const sidebarBranded = createBrandedGraphics(SIDEBAR_BOX_W, SIDEBAR_BOX_H)
const rawOffset = computeRawCenterOffset(dots)

const THEMES = {
  light: {
    pink: '#FF3DA8',
    purple: '#9333EA',
    pinkMid: '#FF5BC4',
    network: '#FFE566',
    tagline: '#64748B',
    divider: '#E2E8F0',
  },
  dark: {
    pink: '#FF5BC4',
    purple: '#A855F7',
    pinkMid: '#FF7AD4',
    network: '#FFE566',
    tagline: '#94a3b8',
    divider: '#334155',
  },
}

const TAGLINE = 'OPEN HEALTH PLATFORM'
const WORDMARK_WIDTH_EM = 5.002

function wordmarkSpanWidth(fontSize) {
  return WORDMARK_WIDTH_EM * fontSize
}

function gradientDef(theme, id = 'aiyra-bg') {
  return `<defs>
    <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.pink}" />
      <stop offset="45%" stop-color="${theme.pinkMid}" />
      <stop offset="100%" stop-color="${theme.purple}" />
    </linearGradient>
  </defs>`
}

function dividerLine(ox, y, width, theme, anchor = 'start') {
  const x1 = anchor === 'middle' ? ox - width / 2 : ox
  const x2 = x1 + width
  return `<line x1="${fmt(x1)}" y1="${y}" x2="${fmt(x2)}" y2="${y}" stroke="${theme.divider}" stroke-width="1" />`
}

function heartIconXml(ox, oy, boxW, boxH, theme, lineXml, circleXml) {
  const rx = Math.round(10 * boxW / BOX_W)
  return `<rect x="${ox}" y="${oy}" width="${boxW}" height="${boxH}" rx="${rx}" fill="url(#aiyra-bg)" />
  <g transform="translate(${ox}, ${oy})" fill="none" stroke="${theme.network}" stroke-width="0.65" stroke-linecap="round" opacity="0.78">\n${lineXml}\n  </g>
  <g transform="translate(${ox}, ${oy})" opacity="0.92">\n${circleXml}\n  </g>`
}

function wordmarkText(theme, ox, oy, size, anchor = 'start', baseline = 'auto') {
  const baselineAttr = baseline === 'auto' ? '' : ` dominant-baseline="${baseline}"`
  return `<text x="${ox}" y="${oy}" text-anchor="${anchor}"${baselineAttr} font-family="Inter, system-ui, sans-serif" font-size="${size}" font-weight="600">
    <tspan fill="${theme.pink}">Aiyra</tspan><tspan fill="${theme.purple}"> Care</tspan>
  </text>`
}

function taglineText(theme, ox, oy, fontSize, anchor = 'start', baseline = 'auto', textLength = null) {
  const baselineAttr = baseline === 'auto' ? '' : ` dominant-baseline="${baseline}"`
  const widthAttr =
    textLength != null
      ? ` textLength="${fmt(textLength)}" lengthAdjust="spacingAndGlyphs"`
      : ` letter-spacing="${fontSize <= 12 ? 1.6 : 2}"`
  return `<text
    x="${ox}"
    y="${oy}"
    text-anchor="${anchor}"${baselineAttr}
    font-family="Inter, system-ui, sans-serif"
    font-size="${fontSize}"
    font-weight="500"${widthAttr}
    fill="${theme.tagline}"
  >${TAGLINE}</text>`
}

function layoutHorizontalWordmark(textX, boxTop, boxHeight) {
  const tagSize = 12
  const wmHeightRatio = 0.82
  let wmSize = 52
  for (;;) {
    const wmH = wmSize * wmHeightRatio
    const tagH = tagSize * 1.05
    const remaining = boxHeight - wmH - tagH - 1
    if (remaining >= 4 || wmSize <= 34) break
    wmSize -= 1
  }
  const wmH = wmSize * wmHeightRatio
  const tagH = tagSize * 1.05
  const gap = (boxHeight - wmH - tagH - 1) / 2
  const wmW = wordmarkSpanWidth(wmSize)
  return {
    wmSize,
    tagSize,
    wmY: boxTop,
    lineY: boxTop + wmH + gap,
    tagY: boxTop + boxHeight,
    wmW,
  }
}

function horizontalWordmarkBlock(theme, textX, boxTop, boxHeight) {
  const layout = layoutHorizontalWordmark(textX, boxTop, boxHeight)
  return `${wordmarkText(theme, textX, layout.wmY, layout.wmSize, 'start', 'hanging')}
  ${dividerLine(textX, layout.lineY, layout.wmW, theme)}
  ${taglineText(theme, textX, layout.tagY, layout.tagSize, 'start', 'text-after-edge')}`
}

function sidebarWordmarkLayout(boxTop, boxHeight) {
  const inset = 8
  const wmSize = Math.round((boxHeight - inset) * 0.78)
  const wmW = wordmarkSpanWidth(wmSize)
  const centerY = boxTop + boxHeight / 2
  return { wmSize, wmW, centerY }
}

function sidebarWordmarkBlock(theme, textX, boxTop, boxHeight) {
  const { wmSize, centerY } = sidebarWordmarkLayout(boxTop, boxHeight)
  return wordmarkText(theme, textX, centerY, wmSize, 'start', 'middle')
}

function wordmarkOnlySvg(theme) {
  const wmSize = 36
  const wmW = wordmarkSpanWidth(wmSize)
  const padX = 2
  const padY = 4
  const width = wmW + padX * 2
  const height = wmSize * 0.88 + padY * 2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(width)} ${fmt(height)}" fill="none" role="img" aria-label="Aiyra Care">
  ${wordmarkText(theme, padX, padY, wmSize, 'start', 'hanging')}
</svg>\n`
}

function layoutStackedWordmark(theme, centerX, boxBottom, wmSize = STACKED_WM_SIZE, boxGap = STACKED_BOX_GAP) {
  const tagSize = STACKED_TAG_SIZE
  const wmW = wordmarkSpanWidth(wmSize)
  const wmH = wmSize * 0.82
  const wmY = boxBottom + boxGap
  const lineY = wmY + wmH + 8
  const tagY = lineY + 16
  const tagH = tagSize * 1.05
  const bottom = tagY + tagH
  const block = `${wordmarkText(theme, centerX, wmY, wmSize, 'middle', 'hanging')}
  ${dividerLine(centerX, lineY, wmW, theme, 'middle')}
  ${taglineText(theme, centerX, tagY, tagSize, 'middle')}`
  return { wmW, bottom, block }
}

function stackedLogoSvg(theme, lineXml, circleXml) {
  const wmW = wordmarkSpanWidth(STACKED_WM_SIZE)
  const viewW = Math.max(BOX_W + STACKED_PAD_X * 2, wmW + STACKED_PAD_X * 2)
  const iconX = (viewW - BOX_W) / 2
  const centerX = viewW / 2
  const boxBottom = STACKED_PAD_TOP + BOX_H
  const layout = layoutStackedWordmark(theme, centerX, boxBottom)
  const viewH = layout.bottom + STACKED_PAD_X
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(viewW)} ${fmt(viewH)}" fill="none" role="img" aria-label="Aiyra Care stacked logo">
  ${gradientDef(theme)}
  ${heartIconXml(iconX, STACKED_PAD_TOP, BOX_W, BOX_H, theme, lineXml, circleXml)}
  ${layout.block}
</svg>\n`
}

function writeLogoSet(themeName, theme, lineXml, circleXml, sidebarLineXml, sidebarCircleXml) {
  const suffix = themeName === 'dark' ? '-dark' : ''
  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 104" fill="none" role="img" aria-label="Aiyra Care icon">
  ${gradientDef(theme)}
  ${heartIconXml(12, 12, BOX_W, BOX_H, theme, lineXml, circleXml)}
</svg>\n`

  const horizontalSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 104" fill="none" role="img" aria-label="Aiyra Care horizontal logo">
  ${gradientDef(theme)}
  ${heartIconXml(12, 12, BOX_W, BOX_H, theme, lineXml, circleXml)}
  ${horizontalWordmarkBlock(theme, 120, 12, BOX_H)}
</svg>\n`

  const stackedSvg = stackedLogoSvg(theme, lineXml, circleXml)

  const sidebarTextX = SIDEBAR_PAD + SIDEBAR_BOX_W + SIDEBAR_GAP
  const sidebarLayout = sidebarWordmarkLayout(SIDEBAR_PAD, SIDEBAR_BOX_H)
  const sidebarViewW = sidebarTextX + sidebarLayout.wmW + SIDEBAR_PAD
  const sidebarViewH = SIDEBAR_PAD * 2 + SIDEBAR_BOX_H
  const sidebarSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(sidebarViewW)} ${fmt(sidebarViewH)}" fill="none" role="img" aria-label="Aiyra Care sidebar logo">
  ${gradientDef(theme)}
  ${heartIconXml(SIDEBAR_PAD, SIDEBAR_PAD, SIDEBAR_BOX_W, SIDEBAR_BOX_H, theme, sidebarLineXml, sidebarCircleXml)}
  ${sidebarWordmarkBlock(theme, sidebarTextX, SIDEBAR_PAD, SIDEBAR_BOX_H)}
</svg>\n`

  const wordmarkSvg = wordmarkOnlySvg(theme)

  writeFileSync(join(proposalsDir, `logo-grid-icon${suffix}.svg`), iconSvg)
  writeFileSync(join(proposalsDir, `logo-grid-horizontal${suffix}.svg`), horizontalSvg)
  writeFileSync(join(proposalsDir, `logo-grid-stacked${suffix}.svg`), stackedSvg)
  writeFileSync(join(proposalsDir, `logo-grid-sidebar${suffix}.svg`), sidebarSvg)
  writeFileSync(join(proposalsDir, `logo-grid-wordmark${suffix}.svg`), wordmarkSvg)

  if (themeName === 'light') {
    writeFileSync(join(proposalsDir, 'heart-grid-256-preview.svg'), iconSvg)
    writeFileSync(join(brandDir, 'logo-icon.svg'), iconSvg)
    writeFileSync(join(brandDir, 'logo-horizontal.svg'), horizontalSvg)
    writeFileSync(join(brandDir, 'logo-square.svg'), stackedSvg)
    writeFileSync(join(brandDir, 'logo-sidebar.svg'), sidebarSvg)
    writeFileSync(join(brandDir, 'logo-wordmark.svg'), wordmarkSvg)
  } else {
    writeFileSync(join(brandDir, 'logo-icon-dark.svg'), iconSvg)
    writeFileSync(join(brandDir, 'logo-horizontal-dark.svg'), horizontalSvg)
    writeFileSync(join(brandDir, 'logo-square-dark.svg'), stackedSvg)
    writeFileSync(join(brandDir, 'logo-sidebar-dark.svg'), sidebarSvg)
    writeFileSync(join(brandDir, 'logo-wordmark-dark.svg'), wordmarkSvg)
  }
}

// Raw 256x256 grid view (radius in grid units)
const rawLineXml = allLines
  .map(([a, b]) => {
    const x1 = a.gx + 0.5 + rawOffset.offsetX
    const y1 = a.gy + 0.5 + rawOffset.offsetY
    const x2 = b.gx + 0.5 + rawOffset.offsetX
    const y2 = b.gy + 0.5 + rawOffset.offsetY
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`
  })
  .join('\n')

const rawCircles = dots
  .map((d) => {
    const r = d.mult / 2
    const cx = d.gx + 0.5 + rawOffset.offsetX
    const cy = d.gy + 0.5 + rawOffset.offsetY
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${THEMES.light.network}" />`
  })
  .join('\n')

writeFileSync(
  join(proposalsDir, 'heart-grid-256-raw.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID} ${GRID}" fill="none" role="img" aria-label="256x256 heart grid">
  <rect width="${GRID}" height="${GRID}" fill="#1a1a2e" />
  <g fill="none" stroke="${THEMES.light.network}" stroke-width="0.65" stroke-linecap="round" opacity="0.72">\n${rawLineXml}\n  </g>
  <g opacity="0.92">\n${rawCircles}\n  </g>
</svg>\n`,
)

const brandedCirclesLight = branded.circleXmlFor(THEMES.light)
const brandedCirclesDark = branded.circleXmlFor(THEMES.dark)
const sidebarCirclesLight = sidebarBranded.circleXmlFor(THEMES.light)
const sidebarCirclesDark = sidebarBranded.circleXmlFor(THEMES.dark)

writeLogoSet('light', THEMES.light, branded.lineXml, brandedCirclesLight, sidebarBranded.lineXml, sidebarCirclesLight)
writeLogoSet('dark', THEMES.dark, branded.lineXml, brandedCirclesDark, sidebarBranded.lineXml, sidebarCirclesDark)

const sizeCounts = Object.fromEntries(SIZE_MULT_GROUPS.map((s) => [s, 0]))
for (const d of dots) sizeCounts[d.mult]++

console.log(
  `grid ${GRID}x${GRID} heart ${allCells.length} kept ${dots.length} centerOffset branded ${fmt(branded.offset.offsetX)},${fmt(branded.offset.offsetY)} sidebar ${SIDEBAR_BOX_W}x${SIDEBAR_BOX_H} lines ${allLines.length} sizes ${JSON.stringify(sizeCounts)}`,
)
