#!/usr/bin/env node
/**
 * Canvas v5 — macro 2×2 left-icon, chrome phases, mirror Auto scroll + scrubber.
 */
import fs from 'fs'

const path =
  process.env.CANVAS_SOURCE ||
  '/cursor/stores/user/canvases/5ced97c4-0aad-4d7b-8b79-798357008230/source.canvas.tsx'

let s = fs.readFileSync(path, 'utf8')

const V5 =
  'const CANVAS_BUILD = "2026-11-27 v5 · regra rolagem (fases macro→header) · dual 2×2 left-icon";'
s = s.replace(/const CANVAS_BUILD = "[^"]+";/, V5)

if (!s.includes('CHROME_MACRO_COMPACT_BY')) {
  s = s.replace(
    'const CHROME_S3 = 0.85;',
    `const CHROME_S3 = 0.85;
const CHROME_MACRO_COMPACT_BY = 0.44;
const CHROME_HEADER_COLLAPSE_START = 0.4;
const SCROLL_CHROME_RANGE = 152;
function chromeMacroPhase(progress: number): number {
  const t = progress / CHROME_MACRO_COMPACT_BY;
  return Math.max(0, Math.min(1, t));
}
function chromeHeaderPhase(progress: number): number {
  const span = 1 - CHROME_HEADER_COLLAPSE_START;
  if (span <= 0) return progress >= 1 ? 1 : 0;
  return Math.max(0, Math.min(1, (progress - CHROME_HEADER_COLLAPSE_START) / span));
}
function chromeMacroCompactLeftIcon(progress: number): boolean {
  return chromeMacroPhase(progress) >= 0.82;
}
function easeChromeProgress(raw: number): number {
  const c = Math.max(0, Math.min(1, raw));
  return c * c * (3 - 2 * c);
}
function resolveMacroMode(chromeP: number): MacroDenseMode {
  if (chromeMacroCompactLeftIcon(chromeP)) return "left-icon";
  return "full";
}`,
  )
}

s = s.replace(
  `const PRESETS = [
  { id: "s0", label: "Expandido (S0)", p: 0 },
  { id: "s3", label: "Recolhido (S3)", p: 0.85 },
  { id: "s2", label: "S2 transição", p: 0.55 },
] as const;`,
  `const PRESETS = [
  { id: "s0", label: "Expandido (S0)", p: 0 },
  { id: "s3", label: "Recolhido (S3)", p: 0.85 },
  { id: "s2", label: "S2 transição", p: 0.55 },
  { id: "auto", label: "Auto (scroll)", p: -1 },
  { id: "scrub", label: "Scrub (p)", p: -1 },
] as const;`,
)

s = s.replace(
  '  useState,\n} from "cursor/canvas";',
  '  useEffect,\n  useRef,\n  useState,\n} from "cursor/canvas";',
)

if (!s.includes('liveChromeP')) {
  s = s.replace(
    '  const [navTab, setNavTab] = useState<NavTab>("home");',
    `  const [navTab, setNavTab] = useState<NavTab>("home");
  const [liveChromeP, setLiveChromeP] = useState(0);`,
  )
}

s = s.replace(
  `  const mirrorChromeP =
    viewMode === "compare"
      ? (comparePreset?.p ?? CHROME_S3)
      : (PRESETS.find((x) => x.id === preset)?.p ?? CHROME_S3);`,
  `  const mirrorChromeP =
    viewMode === "compare"
      ? (comparePreset?.p ?? CHROME_S3)
      : preset === "auto" || preset === "scrub"
        ? liveChromeP
        : (PRESETS.find((x) => x.id === preset)?.p ?? CHROME_S3);
  const macroP = chromeMacroPhase(mirrorChromeP);
  const headerP = chromeHeaderPhase(mirrorChromeP);`,
)

// Mirror controls: scrubber + phase readout
if (!s.includes('chrome-p-scrub')) {
  s = s.replace(
    `        ) : null}
        <Text size="small" tone="secondary" style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
          build: {CANVAS_BUILD}
        </Text>
      </Row>`,
    `        ) : null}
        {viewMode === "mirror" ? (
          <Row gap={8} align="center" wrap style={{ flex: "1 1 100%", maxWidth: 420 }}>
            <Text size="small" tone="secondary">
              chrome-p={mirrorChromeP.toFixed(2)} · p-macro={macroP.toFixed(2)} · p-header={headerP.toFixed(2)}
            </Text>
            <input
              id="chrome-p-scrub"
              type="range"
              min={0}
              max={1000}
              value={Math.round(mirrorChromeP * 1000)}
              onChange={(e) => {
                const v = Number(e.target.value) / 1000;
                setLiveChromeP(v);
                setPreset("scrub");
              }}
              style={{ flex: 1, minWidth: 120 }}
            />
          </Row>
        ) : null}
        <Text size="small" tone="secondary" style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
          build: {CANVAS_BUILD}
        </Text>
      </Row>`,
  )
}

// Macro grid always 2x2
s = s.replace(
  `    <Box style={{ position: "relative", display: "grid", gridTemplateColumns: leftIcon ? "1fr" : "1fr 1fr", gap: leftIcon ? 4 : 8, padding: leftIcon ? "6px 12px 4px" : "12px 16px 8px", background: "transparent" }}>`,
  `    <Box style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: leftIcon ? "6px 12px 4px" : "12px 16px 8px", background: "transparent" }}>`,
)

// PhoneShell: phases + scroll auto
s = s.replace(
  `  macroDense?: MacroDenseMode;
}) {
  const hideTabIcons = bottomDense && !showBottomNavTabIcons;
  const macroMode: MacroDenseMode =
    macroDense ?? (chromeP > 0.35 ? "left-icon" : "full");
  const showCompactHero = chromeP <= 0.18;`,
  `  macroDense?: MacroDenseMode;
  scrollMapsChromeP?: boolean;
  onChromePFromScroll?: (p: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const hideTabIcons = bottomDense && !showBottomNavTabIcons;
  const macroMode: MacroDenseMode = macroDense ?? resolveMacroMode(chromeP);
  const macroPhase = chromeMacroPhase(chromeP);
  const headerPhase = chromeHeaderPhase(chromeP);
  const heroOpacity = Math.max(0, 1 - chromeP * 1.12);
  const heroLift = chromeP * -32;`,
)

s = s.replace(
  `        WebkitOverflowScrolling: "touch",
          zIndex: Z_APP_FORE,
        }}
      >
        <HeaderMirror chromeP={chromeP} specOverlay={specOverlay} showProfileSheet={showProfileSheet} />
        {showCompactHero ? <ProfileHeroMirror /> : null}`,
  `        WebkitOverflowScrolling: "touch",
          zIndex: Z_APP_FORE,
        }}
        ref={scrollRef}
        onScroll={(e) => {
          if (!scrollMapsChromeP || !onChromePFromScroll) return;
          const top = e.currentTarget.scrollTop;
          const raw = Math.min(1, Math.max(0, top / SCROLL_CHROME_RANGE));
          onChromePFromScroll(easeChromeProgress(raw));
        }}
      >
        <HeaderMirror chromeP={chromeP} specOverlay={specOverlay} showProfileSheet={showProfileSheet} />
        {heroOpacity > 0.02 ? (
          <Box style={{ opacity: heroOpacity, transform: \`translate3d(0, \${heroLift}px, 0)\`, transition: "opacity 0.16s ease-out, transform 0.16s ease-out" }}>
            <ProfileHeroMirror />
          </Box>
        ) : null}`,
)

s = s.replace(
  `<StickyPatientNav macroMode={macroMode} />`,
  `<StickyPatientNav macroMode={macroMode} chromeP={chromeP} macroPhase={macroPhase} />`,
)

s = s.replace(
  `function StickyPatientNav({ macroMode }: { macroMode: MacroDenseMode }) {`,
  `function StickyPatientNav({ macroMode, chromeP, macroPhase }: { macroMode: MacroDenseMode; chromeP: number; macroPhase: number }) {`,
)

s = s.replace(
  `<MacroSectionGrid macroMode={macroMode} />`,
  `<MacroSectionGrid macroMode={macroMode} macroPhase={macroPhase} />`,
)

s = s.replace(
  `function MacroSectionGrid({ macroMode }: { macroMode: MacroDenseMode }) {`,
  `function MacroSectionGrid({ macroMode, macroPhase }: { macroMode: MacroDenseMode; macroPhase: number }) {`,
)

s = s.replace(
  `            minHeight: labelsOnly ? 34 : 72,`,
  `            minHeight: leftIcon ? 34 : Math.round(40 + (1 - macroPhase) * 32),`,
)

// HeaderMirror phases
s = s.replace(
  `function HeaderMirror({ chromeP, specOverlay, showProfileSheet }: { chromeP: number; specOverlay: boolean; showProfileSheet: boolean }) {
  const orbScale = 0.75 + chromeP * 0.25;
  const showChip = chromeP > 0.18;`,
  `function HeaderMirror({ chromeP, specOverlay, showProfileSheet }: { chromeP: number; specOverlay: boolean; showProfileSheet: boolean }) {
  const headerPhase = chromeHeaderPhase(chromeP);
  const orbScale = 0.75 + headerPhase * 0.25;
  const showChip = headerPhase > 0.06 || chromeP > 0.72;`,
)

s = s.replace(
  `            <Box style={{ opacity: Math.max(0, 1 - chromeP) }}>
              <KitLockupImg height={36} />
            </Box>`,
  `            <Box style={{ opacity: Math.max(0, 1 - headerPhase * 1.15) }}>
              <KitLockupImg height={36} />
            </Box>`,
)

s = s.replace(
  `          opacity: chromeP,
          transform: \`scale(\${orbScale})\``,
  `          opacity: Math.max(0, headerPhase),
          transform: \`scale(\${orbScale})\``,
)

// Mirror PhoneShell wiring
s = s.replace(
  `            macroDense={mirrorChromeP > 0.35 ? "left-icon" : "full"}
          />`,
  `            macroDense={resolveMacroMode(mirrorChromeP)}
            scrollMapsChromeP={preset === "auto"}
            onChromePFromScroll={setLiveChromeP}
          />`,
)

// Dual S3 explicit left-icon 2x2
s = s.replace(
  `                macroDense="left-icon"
              />`,
  `                macroDense="left-icon"
                bottomDense={true}
              />`,
  1,
)

// Default mirror preset auto when switching to mirror - use useEffect patch separately

fs.writeFileSync(path, s)
console.log('patch-canvas-v5 OK:', path)