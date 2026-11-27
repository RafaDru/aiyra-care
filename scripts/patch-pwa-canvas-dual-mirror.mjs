#!/usr/bin/env node
/** Foco Rafael: duas colunas espelho React expandido + recolhido (sem PNG). */
import fs from 'node:fs'

const outPath =
  process.argv[2] ||
  '/cursor/stores/user/canvases/5ced97c4-0aad-4d7b-8b79-798357008230/source.canvas.tsx'

let src = fs.readFileSync(outPath, 'utf8')

src = src.replace(
  /const CANVAS_BUILD = "[^"]+";/,
  'const CANVAS_BUILD = "2026-11-27 • Expandido × Recolhido (espelho duplo)";',
)

src = src.replace(
  `const VIEW_MODES = [
  { id: "mirror", label: "Espelho só" },
  { id: "compare", label: "Comparar lado a lado" },
  { id: "v1compact", label: "1ª compacta (rod.1)" },
] as const;`,
  `const VIEW_MODES = [
  { id: "dual", label: "Expandido × Recolhido" },
  { id: "mirror", label: "Espelho só" },
  { id: "compare", label: "Comparar × PNG v6" },
] as const;`,
)

src = src.replace(
  `const PRESETS = [
  { id: "s3", label: "S3 scroll máximo", p: 0.85 },
  { id: "s2", label: "S2", p: 0.55 },
  { id: "s0", label: "S0 topo", p: 0 },
  { id: "v1", label: "1ª compacta (só compacto)", p: 0.85 },
] as const;`,
  `const PRESETS = [
  { id: "s0", label: "Expandido (S0)", p: 0 },
  { id: "s3", label: "Recolhido (S3)", p: 0.85 },
  { id: "s2", label: "S2 transição", p: 0.55 },
] as const;`,
)

src = src.replace(
  `const [viewMode, setViewMode] = useState<(typeof VIEW_MODES)[number]["id"]>("compare");`,
  `const [viewMode, setViewMode] = useState<(typeof VIEW_MODES)[number]["id"]>("dual");`,
)

src = src.replace(
  `const [preset, setPreset] = useState<(typeof PRESETS)[number]["id"]>("s3");`,
  `const [preset, setPreset] = useState<(typeof PRESETS)[number]["id"]>("s0");`,
)

src = src.replace(
  `  const mirrorChromeP =
    viewMode === "compare"
      ? (comparePreset?.p ?? CHROME_S3)
      : (PRESETS.find((x) => x.id === preset)?.p ?? CHROME_S3);`,
  `  const mirrorChromeP =
    viewMode === "compare"
      ? (comparePreset?.p ?? CHROME_S3)
      : (PRESETS.find((x) => x.id === preset)?.p ?? CHROME_S3);
  const isDual = viewMode === "dual";`,
)

src = src.replace(
  `  const mirrorBottomDense =
    viewMode === "v1compact" || preset === "v1" ? true : bottomDense;
  const mirrorPreviewFullChrome =
    viewMode === "v1compact" || preset === "v1" ? false : previewFullChrome;`,
  `  const mirrorBottomDense = bottomDense;
  const mirrorPreviewFullChrome = previewFullChrome;`,
)

src = src.replace(
  `        ) : viewMode === "v1compact" ? null : (`,
  `        ) : (`,
)

const dualBlock = `{viewMode === "dual" ? (
        <Row gap={16} align="start" wrap={false} style={{ width: 820, maxWidth: "100%" }}>
          <Stack gap={6} style={{ flex: "0 0 390px", width: 390, maxWidth: "100%" }}>
            <Text size="small" weight="semibold">
              Expandido (S0) — lockup + hero
            </Text>
            <Box style={{ background: T.page, padding: 8, borderRadius: 24, border: \`1px solid \${T.border}\` }}>
              <PhoneShell
                chromeP={0}
                bottomDense={false}
                previewFullChrome={true}
                specOverlay={false}
                showProfileSheet={false}
                navTab="home"
              />
            </Box>
          </Stack>
          <Stack gap={6} style={{ flex: "0 0 390px", width: 390, maxWidth: "100%" }}>
            <Row gap={8} align="center" wrap>
              <Text size="small" weight="semibold">
                Recolhido (S3) — orb + chip
              </Text>
              <Text size="small" tone="secondary" style={{ fontSize: 10 }}>
                ref v6
              </Text>
            </Row>
            <Box style={{ background: T.page, padding: 8, borderRadius: 24, border: \`1px solid \${T.border}\` }}>
              <PhoneShell
                chromeP={CHROME_S3}
                bottomDense={false}
                previewFullChrome={true}
                specOverlay={false}
                showProfileSheet={false}
                navTab="home"
              />
            </Box>
          </Stack>
        </Row>
      ) : viewMode === "compare" ? (`

const compareContentNeedle = `      {viewMode === "compare" ? (
        <Row gap={16} align="start" wrap={false} style={{ width: 820, maxWidth: "100%" }}>
          <Stack gap={6} style={{ flex: "0 0 390px", width: 390, maxWidth: "100%" }}>
            <Text size="small" weight="semibold">
              Canvas (conceito)
            </Text>`
if (!src.includes('viewMode === "dual"') && src.includes(compareContentNeedle)) {
  src = src.replace(compareContentNeedle, dualBlock + compareContentNeedle.replace('      {viewMode === "compare" ? (\n', '').replace(`            <Text size="small" weight="semibold">\n              Canvas (conceito)\n            </Text>`, `            <Text size="small" weight="semibold">\n              Canvas (conceito)\n            </Text>`))
}

const footerNew =
  'Modo **Expandido × Recolhido**: dois `PhoneShell` React (p=0 e p=0.85). **Comparar × PNG v6** = paridade com capturas. Presets espelho: Expandido (S0) · Recolhido (S3).'
src = src.replace(
  /Comparar v6 · modo 1ª compacta[\s\S]*?chrome=collapsed`\./,
  footerNew,
)
if (!src.includes('Modo **Expandido × Recolhido**')) {
  src = src.replace(
    '              O que este espelho replica',
    '              O que este espelho replica',
  )
  // fallback: replace entire secondary line in card
  src = src.replace(
    /<Text size="small" tone="secondary">\n              [^\n]+\n            <\/Text>/,
    `<Text size="small" tone="secondary">\n              ${footerNew}\n            </Text>`,
  )
}

// Remove unused isDual if we added it but didn't use - use it in a comment or remove
src = src.replace(/\n  const isDual = viewMode === "dual";\n/, '\n')

fs.writeFileSync(outPath, src)
console.log(
  JSON.stringify({
    outPath,
    dual: src.includes('viewMode === "dual"'),
    defaultDual: src.includes('"dual"'),
    v1Gone: !src.includes('v1compact'),
  }),
)