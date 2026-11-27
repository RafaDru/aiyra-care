#!/usr/bin/env node
/**
 * Incremental patch — adiciona frame «1ª compacta (rod.1)» ao espelho 5ced97c4.
 * Rodar depois de patch-pwa-canvas-compare.mjs (ou sobre source já comparável).
 */
import fs from 'node:fs'
import path from 'node:path'

const srcPath =
  process.argv[2] ||
  '/cursor/stores/user/canvases/5ced97c4-0aad-4d7b-8b79-798357008230/source.canvas.tsx'
const mediaDir =
  process.argv[3] ||
  '/cursor/stores/bc-0a0af590-d3d8-48bf-a56e-a19021352d4a/media'
const outPath =
  process.argv[4] ||
  '/cursor/stores/user/canvases/5ced97c4-0aad-4d7b-8b79-798357008230/source.canvas.tsx'

const v1Png = path.join(mediaDir, 'patient-chrome-real-preview-2026-11-27.png')
let src = fs.readFileSync(srcPath, 'utf8')

src = src.replace(
  /const CANVAS_BUILD = "[^"]+";/,
  'const CANVAS_BUILD = "2026-11-27 • 1ª compacta rod.1 + comparar v6 + S0 hero";',
)

if (!src.includes('V1_FIRST_CAPTURE')) {
  const v1B64 = fs.readFileSync(v1Png).toString('base64')
  src = src.replace(
    'const VIEW_MODES = [',
    `const V1_FIRST_CAPTURE = "data:image/png;base64,${v1B64}";\nconst VIEW_MODES = [`,
  )
}

if (!src.includes('"v1compact"')) {
  src = src.replace(
    '{ id: "compare", label: "Comparar lado a lado" },',
    `{ id: "compare", label: "Comparar lado a lado" },
  { id: "v1compact", label: "1ª compacta (rod.1)" },`,
  )
}

src = src.replace(
  '{ id: "collapsed", label: "Recolhido (S3)", p: 0.85 as number, capture: V6_COLLAPSED_CAPTURE },',
  '{ id: "collapsed", label: "Recolhido v6 (S3)", p: 0.85 as number, capture: V6_COLLAPSED_CAPTURE },',
)

if (!src.includes('id: "v1"')) {
  src = src.replace(
    '{ id: "s0", label: "S0 topo", p: 0 },',
    `{ id: "s0", label: "S0 topo", p: 0 },
  { id: "v1", label: "1ª compacta (só compacto)", p: 0.85 },`,
  )
}

if (!src.includes('mirrorBottomDense')) {
  src = src.replace(
    `  const captureSrc = comparePreset?.capture ?? V6_COLLAPSED_CAPTURE;`,
    `  const captureSrc = comparePreset?.capture ?? V6_COLLAPSED_CAPTURE;
  const mirrorBottomDense =
    viewMode === "v1compact" || preset === "v1" ? true : bottomDense;
  const mirrorPreviewFullChrome =
    viewMode === "v1compact" || preset === "v1" ? false : previewFullChrome;`,
  )
}

src = src.replace(
  `        ) : (
          <Select value={preset} onChange={(v) => setPreset(v as (typeof PRESETS)[number]["id"])} options={PRESETS.map((x) => ({ value: x.id, label: x.label }))} />
        )}
        {viewMode === "mirror" ? (`,
  `        ) : viewMode === "v1compact" ? null : (
          <Select value={preset} onChange={(v) => setPreset(v as (typeof PRESETS)[number]["id"])} options={PRESETS.map((x) => ({ value: x.id, label: x.label }))} />
        )}
        {viewMode === "mirror" ? (`,
)

if (!src.includes('viewMode === "v1compact" ?')) {
  src = src.replace(
    `      {viewMode === "compare" ? (`,
    `      {viewMode === "v1compact" ? (
        <Row gap={16} align="start" wrap={false} style={{ width: 820, maxWidth: "100%" }}>
          <Stack gap={6} style={{ flex: "0 0 390px", width: 390, maxWidth: "100%" }}>
            <Text size="small" weight="semibold">
              Canvas (conceito) — pré expand/collapse
            </Text>
            <Box style={{ background: T.page, padding: 8, borderRadius: 24, border: \`1px solid \${T.border}\` }}>
              <PhoneShell
                chromeP={CHROME_S3}
                bottomDense={true}
                previewFullChrome={false}
                specOverlay={false}
                showProfileSheet={false}
                navTab="home"
              />
            </Box>
          </Stack>
          <Stack gap={6} style={{ flex: "0 0 390px", width: 390, maxWidth: "100%" }}>
            <Text size="small" weight="semibold">
              Código real (1ª captura)
            </Text>
            <Box
              style={{
                width: 390,
                maxWidth: "100%",
                borderRadius: 20,
                overflow: "hidden",
                border: \`1px solid \${T.border}\`,
                background: T.page,
              }}
            >
              <img
                src={V1_FIRST_CAPTURE}
                alt="Captura rod.1 patient-chrome-real-preview-2026-11-27.png"
                style={{ display: "block", width: "100%", height: "auto" }}
              />
            </Box>
            <Text size="small" tone="secondary">
              Paridade dev: \`/design/patient-chrome?chrome=collapsed\` (sem hero S0 — distinto de v6-collapsed.png).
            </Text>
          </Stack>
        </Row>
      ) : viewMode === "compare" ? (`,
  )
}

src = src.replace(
  `            chromeP={mirrorChromeP}
            bottomDense={bottomDense}
            previewFullChrome={previewFullChrome}`,
  `            chromeP={mirrorChromeP}
            bottomDense={mirrorBottomDense}
            previewFullChrome={mirrorPreviewFullChrome}`,
)

const footerOld =
  'Comparar: espelho React × capturas v6 (`patient-chrome-real-preview-2026-11-27-v6-*.png`). Dev: `http://localhost:5173/design/patient-chrome-compare`.'
const footerNew =
  'Comparar v6 · modo 1ª compacta = `patient-chrome-real-preview-2026-11-27.png` (rod.1). Dev: `/design/patient-chrome-compare` · `/design/patient-chrome?chrome=collapsed`.'
if (src.includes(footerOld)) src = src.replace(footerOld, footerNew)

fs.writeFileSync(outPath, src)
const stat = fs.statSync(outPath)
console.log(JSON.stringify({ outPath, bytes: stat.size, mb: (stat.size / 1e6).toFixed(2), v1compact: src.includes('v1compact') }))