#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const srcPath = process.argv[2] || '/cursor/stores/user/canvases/5ced97c4-0aad-4d7b-8b79-798357008230/source.canvas.tsx'
const mediaDir =
  process.argv[3] ||
  '/cursor/stores/bc-0a0af590-d3d8-48bf-a56e-a19021352d4a/media'
const outPath = process.argv[4] || '/tmp/canvas-compare-patched.tsx'

const expPng = path.join(mediaDir, 'patient-chrome-real-preview-2026-11-27-v6-expanded.png')
const colPng = path.join(mediaDir, 'patient-chrome-real-preview-2026-11-27-v6-collapsed.png')

let src = fs.readFileSync(srcPath, 'utf8')

const expB64 = fs.readFileSync(expPng).toString('base64')
const colB64 = fs.readFileSync(colPng).toString('base64')

src = src.replace(
  /const CANVAS_BUILD = "[^"]+";/,
  'const CANVAS_BUILD = "2026-11-27 • 1ª compacta rod.1 + comparar v6 + S0 hero";',
)

const injection = `
const V6_EXPANDED_CAPTURE = "data:image/png;base64,${expB64}";
const V6_COLLAPSED_CAPTURE = "data:image/png;base64,${colB64}";
const VIEW_MODES = [
  { id: "mirror", label: "Espelho só" },
  { id: "compare", label: "Comparar lado a lado" },
] as const;
const COMPARE_CHROME = [
  { id: "expanded", label: "Expandido (S0)", p: 0 as number, capture: V6_EXPANDED_CAPTURE },
  { id: "collapsed", label: "Recolhido (S3)", p: 0.85 as number, capture: V6_COLLAPSED_CAPTURE },
] as const;
`

if (!src.includes('V6_EXPANDED_CAPTURE')) {
  src = src.replace('const PRESETS = [', `${injection}\nconst PRESETS = [`)
}

if (!src.includes('function ProfileHeroMirror')) {
  const heroFn = `
function ProfileHeroMirror() {
  return (
    <Box style={{ padding: "8px 12px 4px", position: "relative", zIndex: 2 }}>
      <Box
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 8px",
          borderRadius: 8,
          color: T.muted,
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        <span style={{ fontSize: 14 }}>←</span>
        <span>Voltar</span>
      </Box>
      <Box style={{ marginTop: 8, padding: 16, borderRadius: 16, border: \`1px solid \${T.border}\`, background: T.card, boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)" }}>
        <Box style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Box
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              background: "#4F46E5",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            B
          </Box>
          <Box>
            <Text weight="semibold" style={{ fontSize: 17, color: T.text }}>Bruno Silva</Text>
            <Text size="small" tone="secondary">8 anos · Masculino</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
`
  src = src.replace('function PhoneShell({', `${heroFn}\n\nfunction PhoneShell({`)
}

if (!src.includes('showCompactHero')) {
  src = src.replace(
    'const macroLabelsOnly = chromeP > 0.62 && !previewFullChrome;',
    'const macroLabelsOnly = chromeP > 0.62 && !previewFullChrome;\n  const showCompactHero = chromeP <= 0.18;',
  )
  src = src.replace(
    '<HeaderMirror chromeP={chromeP} specOverlay={specOverlay} showProfileSheet={showProfileSheet} />',
    `<HeaderMirror chromeP={chromeP} specOverlay={specOverlay} showProfileSheet={showProfileSheet} />\n      {showCompactHero ? <ProfileHeroMirror /> : null}`,
  )
}

const oldMain = `export default function AnaneriPwaMirrorS3() {
  const [preset, setPreset] = useState<(typeof PRESETS)[number]["id"]>("s3");
  const [bottomDense, setBottomDense] = useState(true);
  const [previewFullChrome, setPreviewFullChrome] = useState(true);
  const [specOverlay, setSpecOverlay] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [navTab, setNavTab] = useState<NavTab>("home");
  const chromeP = PRESETS.find((x) => x.id === preset)?.p ?? CHROME_S3;

  return (
    <Stack gap={16}>
      <Stack gap={6}>
        <H1>Espelho fiel — PWA perfil (390px) · bottom nav</H1>
        <Text tone="secondary">
          Macro (ícones) em cima, carrossel B+ embaixo, bottom nav Ant Design, Neri \`ava-avatar.svg\`, PAT-CTX sheet opcional. ·{" "}
          <Text as="span" size="small" style={{ color: "#DB2777", fontWeight: 600 }}>
            {CANVAS_BUILD}
          </Text>
        </Text>
      </Stack>

      <Row gap={10} wrap align="center">
        <Select value={preset} onChange={(v) => setPreset(v as (typeof PRESETS)[number]["id"])} options={PRESETS.map((x) => ({ value: x.id, label: x.label }))} />
        <Row gap={6} align="center">
          <Toggle checked={bottomDense} onChange={setBottomDense} />
          <Text size="small">bottom denso (S3)</Text>
        </Row>
        <Row gap={6} align="center">
          <Toggle checked={previewFullChrome} onChange={setPreviewFullChrome} />
          <Text size="small">menu inferior — ícones</Text>
        </Row>
        <Row gap={6} align="center">
          <Toggle checked={specOverlay} onChange={setSpecOverlay} />
          <Text size="small">medidas CSS</Text>
        </Row>
        <Row gap={6} align="center">
          <Toggle checked={showProfileSheet} onChange={setShowProfileSheet} />
          <Text size="small">sheet perfil</Text>
        </Row>
        <Select value={navTab} onChange={(v) => setNavTab(v as NavTab)} options={NAV_TABS.map((x) => ({ value: x.id, label: \`aba ativa — \${x.label}\` }))} />
      </Row>

      <Box style={{ width: 390, maxWidth: "100%", margin: "0 auto", background: T.page, padding: 8, borderRadius: 24 }}>
        <PhoneShell
          chromeP={chromeP}
          bottomDense={bottomDense}
          previewFullChrome={previewFullChrome}
          specOverlay={specOverlay}
          showProfileSheet={showProfileSheet}
          navTab={navTab}
        />
      </Box>

      <Card>
        <CardBody>
          <Stack gap={6}>
            <Text size="small" weight="semibold">
              O que este espelho replica
            </Text>
            <Text size="small" tone="secondary">
              \`.app-header__heart-orb\` · \`.app-header__patient-ctx-slot\` · \`.patient-sub-tabs-bplus\` · \`.patient-section-nav--labels-only\` ·
              barra inferior contínua com arco puxador na Neri · ícones outline → filled na aba ativa.
            </Text>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}`

const newMain = `export default function AnaneriPwaMirrorS3() {
  const [viewMode, setViewMode] = useState<(typeof VIEW_MODES)[number]["id"]>("compare");
  const [compareChrome, setCompareChrome] = useState<(typeof COMPARE_CHROME)[number]["id"]>("expanded");
  const [preset, setPreset] = useState<(typeof PRESETS)[number]["id"]>("s3");
  const [bottomDense, setBottomDense] = useState(true);
  const [previewFullChrome, setPreviewFullChrome] = useState(true);
  const [specOverlay, setSpecOverlay] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [navTab, setNavTab] = useState<NavTab>("home");

  const comparePreset = COMPARE_CHROME.find((x) => x.id === compareChrome);
  const mirrorChromeP =
    viewMode === "compare"
      ? (comparePreset?.p ?? CHROME_S3)
      : (PRESETS.find((x) => x.id === preset)?.p ?? CHROME_S3);
  const captureSrc = comparePreset?.capture ?? V6_COLLAPSED_CAPTURE;

  return (
    <Stack gap={16}>
      <Stack gap={6}>
        <H1>Espelho fiel — PWA perfil (390px) · bottom nav</H1>
        <Text tone="secondary">
          Macro (ícones) em cima, carrossel B+ embaixo, bottom nav Ant Design, Neri \`ava-avatar.svg\`, PAT-CTX sheet opcional. ·{" "}
          <Text as="span" size="small" style={{ color: "#DB2777", fontWeight: 600 }}>
            {CANVAS_BUILD}
          </Text>
        </Text>
      </Stack>

      <Row gap={10} wrap align="center">
        <Select
          value={viewMode}
          onChange={(v) => setViewMode(v as (typeof VIEW_MODES)[number]["id"])}
          options={VIEW_MODES.map((x) => ({ value: x.id, label: x.label }))}
        />
        {viewMode === "compare" ? (
          <Select
            value={compareChrome}
            onChange={(v) => setCompareChrome(v as (typeof COMPARE_CHROME)[number]["id"])}
            options={COMPARE_CHROME.map((x) => ({ value: x.id, label: x.label }))}
          />
        ) : (
          <Select value={preset} onChange={(v) => setPreset(v as (typeof PRESETS)[number]["id"])} options={PRESETS.map((x) => ({ value: x.id, label: x.label }))} />
        )}
        {viewMode === "mirror" ? (
          <>
            <Row gap={6} align="center">
              <Toggle checked={bottomDense} onChange={setBottomDense} />
              <Text size="small">bottom denso (S3)</Text>
            </Row>
            <Row gap={6} align="center">
              <Toggle checked={previewFullChrome} onChange={setPreviewFullChrome} />
              <Text size="small">menu inferior — ícones</Text>
            </Row>
            <Row gap={6} align="center">
              <Toggle checked={specOverlay} onChange={setSpecOverlay} />
              <Text size="small">medidas CSS</Text>
            </Row>
            <Row gap={6} align="center">
              <Toggle checked={showProfileSheet} onChange={setShowProfileSheet} />
              <Text size="small">sheet perfil</Text>
            </Row>
            <Select value={navTab} onChange={(v) => setNavTab(v as NavTab)} options={NAV_TABS.map((x) => ({ value: x.id, label: \`aba ativa — \${x.label}\` }))} />
          </>
        ) : null}
      </Row>

      {viewMode === "compare" ? (
        <Row gap={16} align="start" wrap={false} style={{ width: 820, maxWidth: "100%" }}>
          <Stack gap={6} style={{ flex: "0 0 390px", width: 390, maxWidth: "100%" }}>
            <Text size="small" weight="semibold">
              Canvas (conceito)
            </Text>
            <Box style={{ background: T.page, padding: 8, borderRadius: 24, border: \`1px solid \${T.border}\` }}>
              <PhoneShell
                chromeP={mirrorChromeP}
                bottomDense={false}
                previewFullChrome={true}
                specOverlay={false}
                showProfileSheet={false}
                navTab="home"
              />
            </Box>
          </Stack>
          <Stack gap={6} style={{ flex: "0 0 390px", width: 390, maxWidth: "100%" }}>
            <Text size="small" weight="semibold">
              Código real (v6)
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
                src={captureSrc}
                alt={compareChrome === "expanded" ? "Captura v6 expandido" : "Captura v6 recolhido"}
                style={{ display: "block", width: "100%", height: "auto" }}
              />
            </Box>
          </Stack>
        </Row>
      ) : (
        <Box style={{ width: 390, maxWidth: "100%", margin: "0 auto", background: T.page, padding: 8, borderRadius: 24 }}>
          <PhoneShell
            chromeP={mirrorChromeP}
            bottomDense={bottomDense}
            previewFullChrome={previewFullChrome}
            specOverlay={specOverlay}
            showProfileSheet={showProfileSheet}
            navTab={navTab}
          />
        </Box>
      )}

      <Card>
        <CardBody>
          <Stack gap={6}>
            <Text size="small" weight="semibold">
              O que este espelho replica
            </Text>
            <Text size="small" tone="secondary">
              Comparar: espelho React × capturas v6 (\`patient-chrome-real-preview-2026-11-27-v6-*.png\`). Dev: \`http://localhost:5173/design/patient-chrome-compare\`.
            </Text>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}`

if (src.includes('const [viewMode, setViewMode]')) {
  console.error('Canvas already patched')
} else if (!src.includes(oldMain.slice(0, 80))) {
  console.error('Main component block not found — manual merge needed')
  process.exit(1)
} else {
  src = src.replace(oldMain, newMain)
}

fs.writeFileSync(outPath, src)
const stat = fs.statSync(outPath)
console.log(JSON.stringify({ outPath, bytes: stat.size, mb: (stat.size / 1e6).toFixed(2) }))