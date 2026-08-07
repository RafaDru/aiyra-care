import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const proposalsDir = join(__dirname, '../public/brand/proposals')

const CENTER_X = 48
const CENTER_Y = 44
const CONTOUR_KEEP_RATIO = 0.5

function heartRaw(t) {
  const x = 16 * Math.pow(Math.sin(t), 3)
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
  return [x, -y]
}

function buildHeartTransform() {
  const samples = []
  for (let i = 0; i < 160; i++) {
    samples.push(heartRaw((i / 160) * 2 * Math.PI))
  }
  const xs = samples.map((p) => p[0])
  const ys = samples.map((p) => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const pad = 6
  const targetW = 96 - pad * 2
  const targetH = 88 - pad * 2
  const scale = Math.min(targetW / (maxX - minX), targetH / (maxY - minY))
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const ox = CENTER_X
  const oy = CENTER_Y

  const map = (x, y) => [ox + (x - cx) * scale, oy + (y - cy) * scale]

  return { map }
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

function insetTowardCenter(x, y, amount) {
  const dx = CENTER_X - x
  const dy = CENTER_Y - y
  const len = Math.hypot(dx, dy)
  if (len < 0.01) return [x, y]
  return [x + (dx / len) * amount, y + (dy / len) * amount]
}

function circleInsideHeart(cx, cy, r, polygon) {
  if (!pointInPolygon(cx, cy, polygon)) return false
  for (let a = 0; a < 12; a++) {
    const angle = (a / 12) * Math.PI * 2
    const px = cx + r * Math.cos(angle)
    const py = cy + r * Math.sin(angle)
    if (!pointInPolygon(px, py, polygon)) return false
  }
  return true
}

function tooClose(x, y, pts, minDist) {
  return pts.some((p) => Math.hypot(x - p[0], y - p[1]) < minDist)
}

function boundaryRadius(y) {
  const r = y < 32 ? 1.5 + (32 - y) * 0.02 : 1.4
  return Math.min(r, 1.9)
}

function dedupeOrdered(pts, minDist) {
  const out = []
  for (const [x, y] of pts) {
    const close = out.some((q) => Math.hypot(x - q[0], y - q[1]) < minDist)
    if (!close) out.push([x, y])
  }
  return out
}

function nearPoint(x, y, target, tolerance = 1.2) {
  return Math.hypot(x - target[0], y - target[1]) <= tolerance
}

function pickEvenly(indices, count) {
  if (count <= 0) return []
  if (count >= indices.length) return [...indices]
  const out = []
  const step = indices.length / count
  for (let k = 0; k < count; k++) {
    out.push(indices[Math.floor(k * step)])
  }
  return out
}

function subsampleContour(pts, anchorIndices, keepRatio) {
  const target = Math.max(anchorIndices.length, Math.round(pts.length * keepRatio))
  const anchorSet = new Set(anchorIndices)
  const removable = pts.map((_, i) => i).filter((i) => !anchorSet.has(i))
  const needFromRemovable = target - anchorIndices.length

  if (needFromRemovable <= 0) {
    return anchorIndices.map((i) => pts[i])
  }

  const picked = pickEvenly(removable, needFromRemovable)
  const kept = [...anchorIndices, ...picked].sort((a, b) => a - b)
  return kept.map((i) => pts[i])
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

function placeBoundaryPoint(surfaceX, surfaceY, polygon) {
  const baseR = boundaryRadius(surfaceY)

  for (let attempt = 0; attempt < 20; attempt++) {
    const inset = baseR + 0.2 + attempt * 0.12
    const r = Math.max(1.1, baseR - attempt * 0.06)
    const [x, y] = insetTowardCenter(surfaceX, surfaceY, inset)
    if (circleInsideHeart(x, y, r, polygon)) {
      return [x, y, r, false]
    }
  }

  throw new Error(`Could not place boundary point inside heart at ${surfaceX}, ${surfaceY}`)
}

function buildScaledHeartPoints() {
  const { map } = buildHeartTransform()

  const topAnchor = map(...heartRaw(0))
  const bottomAnchor = map(...heartRaw(Math.PI))
  const anchorPositions = [topAnchor, bottomAnchor]

  const tValues = []
  const add = (t) => tValues.push(t)
  for (let i = 0; i <= 120; i++) {
    const t = (i / 120) * 2 * Math.PI
    add(t)
    const [, y] = heartRaw(t)
    if (y < 10) {
      add(t + 0.02)
      add(t - 0.02)
    }
    if (y < 6) {
      add(t + 0.01)
      add(t - 0.01)
      add(t + 0.005)
      add(t - 0.005)
    }
  }

  const fullContour = dedupeOrdered(
    tValues.map((t) => {
      const [x, y] = heartRaw(t)
      return map(x, y)
    }),
    2.4,
  )

  const anchorIndices = fullContour
    .map((pt, i) => (anchorPositions.some((anchor) => nearPoint(pt[0], pt[1], anchor)) ? i : -1))
    .filter((i) => i >= 0)

  if (anchorIndices.length < 2) {
    throw new Error('Could not locate parametric anchor points on contour')
  }

  const removedCount = fullContour.length - Math.round(fullContour.length * CONTOUR_KEEP_RATIO)
  const reducedContourCoords = subsampleContour(fullContour, anchorIndices, CONTOUR_KEEP_RATIO)

  const withAnchors = [...reducedContourCoords]
  for (const anchor of anchorPositions) {
    if (!withAnchors.some(([x, y]) => nearPoint(x, y, anchor, 0.8))) {
      withAnchors.push(anchor)
    }
  }

  const contourPolygon = fullContour
  const boundary = withAnchors.map(([sx, sy]) => placeBoundaryPoint(sx, sy, contourPolygon))

  const xs = contourPolygon.map((p) => p[0])
  const ys = contourPolygon.map((p) => p[1])
  const minX = Math.min(...xs) + 2
  const maxX = Math.max(...xs) - 2
  const minY = Math.min(...ys) + 2
  const maxY = Math.max(...ys) - 2

  const interior = []
  let attempts = 0
  const maxAttempts = removedCount * 300

  while (interior.length < removedCount && attempts < maxAttempts) {
    attempts++
    const x = minX + Math.random() * (maxX - minX)
    const y = minY + Math.random() * (maxY - minY)
    const r = 1.7
    if (!circleInsideHeart(x, y, r, contourPolygon)) continue
    if (tooClose(x, y, boundary, 2.4)) continue
    if (tooClose(x, y, interior, 2.4)) continue
    interior.push([x, y, r, true])
  }

  if (interior.length < removedCount) {
    throw new Error(`Could only place ${interior.length}/${removedCount} interior points`)
  }

  return {
    pts: [...boundary, ...interior],
    contourPolygon,
    anchors: {
      bottom: bottomAnchor,
      top: topAnchor,
    },
  }
}

function lineKey(i, j) {
  return i < j ? `${i}-${j}` : `${j}-${i}`
}

function buildNetwork(pts, maxDist = 8.2) {
  const lines = []
  const lineSet = new Set()
  const adjacency = Array.from({ length: pts.length }, () => new Set())

  const addLine = (i, j) => {
    const key = lineKey(i, j)
    if (lineSet.has(key)) return
    lineSet.add(key)
    lines.push([i, j])
    adjacency[i].add(j)
    adjacency[j].add(i)
  }

  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1])
      if (d <= maxDist) addLine(i, j)
    }
  }

  for (let i = 0; i < pts.length; i++) {
    if (!pts[i][3]) continue
    if (adjacency[i].size >= 2) continue

    const candidates = []
    for (let j = 0; j < pts.length; j++) {
      if (j === i || adjacency[i].has(j)) continue
      candidates.push(j)
    }
    shuffle(candidates)

    for (const j of candidates) {
      addLine(i, j)
      if (adjacency[i].size >= 2) break
    }

    if (adjacency[i].size < 2) {
      throw new Error(`Interior point ${i} has only ${adjacency[i].size} connections`)
    }
  }

  return lines
}

function validate(pts, contourPolygon, lines) {
  const adjacency = Array.from({ length: pts.length }, () => new Set())
  for (const [i, j] of lines) {
    adjacency[i].add(j)
    adjacency[j].add(i)
  }

  for (let i = 0; i < pts.length; i++) {
    const [x, y, r, isInterior] = pts[i]
    if (!circleInsideHeart(x, y, r, contourPolygon)) {
      throw new Error(`Point ${i} circle extends outside heart (${x}, ${y}, r=${r})`)
    }
    if (isInterior && adjacency[i].size < 2) {
      throw new Error(`Interior point ${i} has only ${adjacency[i].size} connections`)
    }
  }
}

function fmt(n) {
  return Number(n.toFixed(1)).toString()
}

function heartBlock(translateX, translateY, pts, lines) {
  let linesXml = ''
  for (const [i, j] of lines) {
    linesXml += `    <line x1="${fmt(pts[i][0])}" y1="${fmt(pts[i][1])}" x2="${fmt(pts[j][0])}" y2="${fmt(pts[j][1])}" />\n`
  }
  let circlesXml = ''
  for (const [x, y, r] of pts) {
    circlesXml += `    <circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(r)}" fill="#FFDE17" />\n`
  }
  return `  <g transform="translate(${translateX}, ${translateY})" stroke="#FFDE17" stroke-width="1.1" stroke-linecap="round" opacity="1">\n${linesXml}  </g>\n  <g transform="translate(${translateX}, ${translateY})">\n${circlesXml}  </g>`
}

const { pts, contourPolygon, anchors } = buildScaledHeartPoints()
const lines = buildNetwork(pts)
validate(pts, contourPolygon, lines)

const boundaryCount = pts.filter((p) => !p[3]).length
const interiorCount = pts.filter((p) => p[3]).length

const heart16 = heartBlock(16, 12, pts, lines)
const heart12 = heartBlock(12, 12, pts, lines)
const heart62 = heartBlock(62, 12, pts, lines)

writeFileSync(
  join(proposalsDir, 'heart-network-group.snippet.xml'),
  heartBlock(0, 0, pts, lines).replace(/^  /gm, ''),
)

const gradient = `<defs>
    <linearGradient id="aiyra-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ED64A6" />
      <stop offset="100%" stop-color="#6B46C1" />
    </linearGradient>
  </defs>`

writeFileSync(
  join(proposalsDir, 'logo-network-heart.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 112" fill="none" role="img" aria-label="Aiyra Care network heart icon">
  ${gradient}
  <rect x="16" y="12" width="96" height="88" rx="10" fill="url(#aiyra-bg)" />
${heart16}
</svg>\n`,
)

writeFileSync(
  join(proposalsDir, 'logo-horizontal-wordmark.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 112" fill="none" role="img" aria-label="Aiyra Care horizontal logo">
  ${gradient}
  <rect x="12" y="12" width="96" height="88" rx="10" fill="url(#aiyra-bg)" />
${heart12}
  <text x="120" y="48" font-family="Inter, system-ui, sans-serif" font-size="50" font-weight="600">
    <tspan fill="#ED64A6">Aiyra</tspan><tspan fill="#6B46C1"> Care</tspan>
  </text>
  <line x1="120" y1="64" x2="384" y2="64" stroke="#E2E8F0" stroke-width="1" />
  <text
    x="120"
    y="86"
    font-family="Inter, system-ui, sans-serif"
    font-size="16"
    font-weight="500"
    letter-spacing="2.8"
    fill="#64748B"
    textLength="264"
    lengthAdjust="spacingAndGlyphs"
  >OPEN HEALTH PLATFORM</text>
</svg>\n`,
)

writeFileSync(
  join(proposalsDir, 'logo-stacked-wordmark.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" fill="none" role="img" aria-label="Aiyra Care stacked logo">
  ${gradient}
  <rect x="62" y="16" width="96" height="88" rx="10" fill="url(#aiyra-bg)" />
${heart62}
  <text x="110" y="128" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="30" font-weight="600">
    <tspan fill="#ED64A6">Aiyra</tspan><tspan fill="#6B46C1"> Care</tspan>
  </text>
  <line x1="18" y1="146" x2="202" y2="146" stroke="#E2E8F0" stroke-width="1" />
  <text
    x="110"
    y="168"
    text-anchor="middle"
    font-family="Inter, system-ui, sans-serif"
    font-size="14"
    font-weight="500"
    letter-spacing="2.6"
    fill="#64748B"
    textLength="220"
    lengthAdjust="spacingAndGlyphs"
  >OPEN HEALTH PLATFORM</text>
</svg>\n`,
)

console.log(
  `boundary ${boundaryCount} interior ${interiorCount} total ${pts.length} lines ${lines.length}`,
)
