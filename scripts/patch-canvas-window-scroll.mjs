#!/usr/bin/env node
/**
 * Remove fixed 844px cage + inner history overflow from PAT chrome Canvas PhoneShell.
 * Usage: CANVAS_SOURCE=/path/to/source.canvas.tsx node scripts/patch-canvas-window-scroll.mjs
 */
import fs from 'fs'

const path =
  process.env.CANVAS_SOURCE ||
  '/cursor/stores/user/canvases/5ced97c4-0aad-4d7b-8b79-798357008230/source.canvas.tsx'

let s = fs.readFileSync(path, 'utf8')

s = s.replace(
  /const CANVAS_BUILD = "[^"]+";/,
  'const CANVAS_BUILD = "2026-11-27 v3 · scroll janela (sem caixa Resumo)";',
)

const replacements = [
  [
    `        minHeight: 844,
        maxHeight: 844,
        background: "transparent",
        borderRadius: 20,
        overflow: "hidden",`,
    `        minHeight: 844,
        background: "transparent",
        borderRadius: 20,
        overflow: "visible",`,
  ],
  [
    'flex: 1, minHeight: 0, maxHeight: 844, overflow: "hidden"',
    'flex: "none", flexDirection: "column", minHeight: "min-content", overflow: "visible"',
  ],
  [
    `            overflow: "hidden",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,`,
    `            overflow: "visible",
            display: "flex",
            flexDirection: "column",
            flex: "none",`,
  ],
  [
    `<Box style={{ position: "relative", background: "transparent", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>`,
    `<Box style={{ position: "relative", background: "transparent", display: "flex", flexDirection: "column", overflow: "visible", flex: "none" }}>`,
  ],
  [
    `            <Box
              style={{
                position: "relative",
                zIndex: 1,
                padding: 16,
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
                WebkitOverflowScrolling: "touch",
              }}
            >`,
    `            <Box
              style={{
                position: "relative",
                zIndex: 1,
                padding: 16,
                overflow: "visible",
              }}
            >`,
  ],
  ['<Box style={{ height: 140 }} aria-hidden />', '<Box style={{ height: 180 }} aria-hidden data-testid="canvas-bottom-nav-scroll-pad" />'],
  [
    `          flex: 1,
          margin: 12,
          marginTop: 6,
          display: "flex",
          flexDirection: "column",
          gap: 0,
          position: "relative",
          minHeight: 0,`,
    `          margin: 12,
          marginTop: 6,
          display: "flex",
          flexDirection: "column",
          gap: 0,
          position: "relative",
          flex: "none",`,
  ],
]

let applied = 0
for (const [from, to] of replacements) {
  if (s.includes(from)) {
    s = s.replace(from, to)
    applied++
  }
}

fs.writeFileSync(path, s)
console.log(`OK — scroll patch applied (${applied}/${replacements.length} blocks):`, path)