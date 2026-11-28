#!/usr/bin/env node
/**
 * Canvas v6 — chrome-p from phone frame internal scroll (not window.scrollY).
 */
import fs from 'fs'

const path =
  process.env.CANVAS_SOURCE ||
  '/cursor/stores/user/canvases/5ced97c4-0aad-4d7b-8b79-798357008230/source.canvas.tsx'

let s = fs.readFileSync(path, 'utf8')

s = s.replace(
  /const CANVAS_BUILD = "[^"]+";/,
  'const CANVAS_BUILD = "2026-11-27 v6 · rolagem no frame 390 (scroll interno → chrome-p)";',
)

s = s.replace(
  `const VIEW_MODES = [
  { id: "dual", label: "Expandido × Recolhido" },
  { id: "mirror", label: "Espelho só" },
  { id: "compare", label: "Comparar × PNG v6" },
] as const;`,
  `const VIEW_MODES = [
  { id: "scroll", label: "Rolagem (demo)" },
  { id: "dual", label: "Expandido × Recolhido (fixo)" },
  { id: "mirror", label: "Espelho só" },
  { id: "compare", label: "Comparar × PNG v6" },
] as const;`,
)

s = s.replace(
  'const [viewMode, setViewMode] = useState<(typeof VIEW_MODES)[number]["id"]>("dual");',
  'const [viewMode, setViewMode] = useState<(typeof VIEW_MODES)[number]["id"]>("scroll");',
)

if (!s.includes('findPhoneScrollPort')) {
  s = s.replace(
    `function easeChromeProgress(raw: number): number {
  const c = Math.max(0, Math.min(1, raw));
  return c * c * (3 - 2 * c);
}`,
    `function easeChromeProgress(raw: number): number {
  const c = Math.max(0, Math.min(1, raw));
  return c * c * (3 - 2 * c);
}

function findPhoneScrollPort(): HTMLElement | null {
  const doc = globalThis.document;
  if (!doc) return null;
  for (const n of doc.querySelectorAll("div")) {
    if (!(n instanceof HTMLElement)) continue;
    const oy = globalThis.getComputedStyle(n).overflowY;
    if (oy !== "auto" && oy !== "scroll") continue;
    const h = n.clientHeight;
    if (h < 350 || h > 820) continue;
    if (n.parentElement?.clientHeight === 844) return n;
  }
  return null;
}`,
  )
}

s = s.replace(
  `  useEffect(() => {
    if (viewMode !== "mirror" || preset !== "auto") return;
    const onScroll = () => {
      const y = globalThis.scrollY ?? 0;
      const raw = Math.min(1, Math.max(0, y / SCROLL_CHROME_RANGE));
      setLiveChromeP(easeChromeProgress(raw));
    };
    globalThis.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => globalThis.removeEventListener("scroll", onScroll);
  }, [viewMode, preset]);`,
  `  useEffect(() => {
    const active = viewMode === "scroll" || (viewMode === "mirror" && preset === "auto");
    if (!active) return;
    let el: HTMLElement | null = null;
    let detach: (() => void) | undefined;
    const onScroll = () => {
      if (!el) return;
      const raw = Math.min(1, Math.max(0, el.scrollTop / SCROLL_CHROME_RANGE));
      setLiveChromeP(easeChromeProgress(raw));
    };
    const tryBind = () => {
      el = findPhoneScrollPort();
      if (!el) return false;
      el.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      detach = () => el?.removeEventListener("scroll", onScroll);
      return true;
    };
    if (!tryBind()) {
      const poll = globalThis.setInterval(() => {
        if (tryBind()) globalThis.clearInterval(poll);
      }, 80);
      return () => {
        globalThis.clearInterval(poll);
        detach?.();
      };
    }
    return () => detach?.();
  }, [viewMode, preset]);`,
)

// Scrubber + phases on scroll mode too
s = s.replace(
  `        {viewMode === "mirror" ? (
          <Row gap={8} align="center" wrap style={{ flex: "1 1 100%", maxWidth: 420 }}>`,
  `        {viewMode === "mirror" || viewMode === "scroll" ? (
          <Row gap={8} align="center" wrap style={{ flex: "1 1 100%", maxWidth: 520 }}>`,
)

// effective chrome for scroll mode
if (!s.includes('scrollChromeP')) {
  s = s.replace(
    `  const macroP = chromeMacroPhase(mirrorChromeP);
  const headerP = chromeHeaderPhase(mirrorChromeP);`,
    `  const scrollChromeP = viewMode === "scroll" ? liveChromeP : mirrorChromeP;
  const macroP = chromeMacroPhase(scrollChromeP);
  const headerP = chromeHeaderPhase(scrollChromeP);
  const phaseHintChromeP = scrollChromeP;`,
  )
  s = s.replace(
    `              chrome-p={mirrorChromeP.toFixed(2)} · p-macro={macroP.toFixed(2)} · p-header={headerP.toFixed(2)}`,
    `              chrome-p={phaseHintChromeP.toFixed(2)} · p-macro={macroP.toFixed(2)} · p-header={headerP.toFixed(2)}`,
  )
  s = s.replace(
    `              value={Math.round(mirrorChromeP * 1000)}`,
    `              value={Math.round(phaseHintChromeP * 1000)}`,
  )
}

// Insert scroll mode block before dual
if (!s.includes('viewMode === "scroll"')) {
  // already added view mode id - need JSX block
}

const scrollBlock = `      {viewMode === "scroll" ? (
        <Stack gap={10}>
          <Text size="small" tone="secondary">
            Role <Text as="span" weight="semibold">dentro do telefone</Text> (área acima da bottom nav) — scroll interno mapeia chrome-p como no app. Macro (p-macro) antes; lockup+hero (p-header) depois.
          </Text>
          <Box style={{ width: 390, maxWidth: "100%", margin: "0 auto", background: T.page, padding: 8, borderRadius: 24 }}>
            <PhoneShell
              chromeP={liveChromeP}
              bottomDense={liveChromeP > 0.58}
              showBottomNavTabIcons={true}
              specOverlay={specOverlay}
              showProfileSheet={false}
              navTab={navTab}
              macroDense={resolveMacroMode(liveChromeP)}
            />
          </Box>
        </Stack>
      ) : `

s = s.replace(
  `      {viewMode === "dual" ? (`,
  scrollBlock + `viewMode === "dual" ? (`,
)

// Mirror auto hint fix
s = s.replace(
  `Role a **página do Canvas** (como no produto): macro compacta primeiro (p-macro), lockup+hero depois (p-header).`,
  `Role **dentro do frame 390×844** (scroll interno acima da nav) — não precisa rolar a página do Cursor.`,
)

// Remove window spacer in mirror auto
s = s.replace(
  `          {preset === "auto" ? <Box style={{ height: 24 }} aria-hidden /> : null}`,
  ``,
)
s = s.replace(
  `          {preset === "auto" ? <Box style={{ height: "55vh" }} aria-hidden /> : null}`,
  ``,
)

// Add extra scroll pad inside phone for scroll range - increase pad when in scroll listen modes
// Already 180px pad - add spacer at top of scroll content for scroll range in scroll mode only via PhoneShell - skip, user scrolls content

// Card help text
s = s.replace(
  `Modo **Expandido × Recolhido**: dois ` + 'PhoneShell' + ` React (p=0 e p=0.85). **Comparar × PNG v6** = paridade com capturas. Presets espelho: Expandido (S0) · Recolhido (S3).`,
  `**Rolagem (demo)** = um telefone + scroll interno → fases. **Dual** = comparar S0×S3 fixos. **Espelho** = presets + Auto (scroll interno) ou scrubber.`,
)

fs.writeFileSync(path, s)
console.log('v6 patch written', s.includes('v6 · rolagem'))