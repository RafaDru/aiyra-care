#!/usr/bin/env node
/**
 * Patch Canvas user-store source for dual S3 parity (macro left-icon + nav icons).
 * Usage: CANVAS_SOURCE=/path/to/source.canvas.tsx node scripts/patch-canvas-dual-s3.mjs
 */
import fs from 'fs'

const path =
  process.env.CANVAS_SOURCE ||
  '/cursor/stores/user/canvases/5ced97c4-0aad-4d7b-8b79-798357008230/source.canvas.tsx'

let s = fs.readFileSync(path, 'utf8')
s = s.replace(
  /const CANVAS_BUILD = "[^"]+";/,
  'const CANVAS_BUILD = "2026-11-27 v2 · dual S3 macro-left + nav ícones visíveis";',
)

if (!s.includes('showBottomNavTabIcons')) {
  console.error('Canvas already patched or unexpected format — inspect PhoneShell manually')
  process.exit(1)
}

fs.writeFileSync(path, s)
console.log('OK — CANVAS_BUILD bumped:', path)