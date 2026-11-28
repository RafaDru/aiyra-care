#!/usr/bin/env node
/**
 * Canvas v4 republish checklist (hosted tab serves canvas.bundle.gz, not raw source).
 *
 * 1. Patch user-store source (agent node block or manual PhoneShell with 390×844 frame scroll).
 * 2. Save in Cursor with TS clean → "Canvas save accepted" → compiledAt updates in canvas.json.
 * 3. Rafael: close Canvas tab, reopen link from Context. Hard refresh if needed.
 *
 * WriteCanvas (~520KB) often fails — prefer bump CANVAS_BUILD + Save in IDE.
 *
 * Link: https://cursor.com/canvas/store-1b70afcc-bd73-4856-b0a0-08659a158546/5ced97c4-0aad-4d7b-8b79-798357008230
 */
console.log(`Canvas v4 republish — see header comment in ${import.meta.url}`)