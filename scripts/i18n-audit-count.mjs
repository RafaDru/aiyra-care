#!/usr/bin/env node
/**
 * Rough counts of hardcoded UI strings in packages/web (excludes tests, ops if any).
 */
import { execSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const web = join(root, 'packages/web/src')

function count(pattern, glob = '*.tsx') {
  try {
    const out = execSync(
      `rg -c "${pattern}" --glob '${glob}' "${web}" 2>/dev/null || true`,
      { encoding: 'utf8' },
    )
    let total = 0
    for (const line of out.trim().split('\n').filter(Boolean)) {
      const n = Number(line.split(':').pop())
      if (!Number.isNaN(n)) total += n
    }
    return total
  } catch {
    return 0
  }
}

const metrics = {
  messageLiteral: count('message\\.(success|error|warning|info)\\([\'"`][^t\\(]'),
  titleLiteral: count('title="[^{]'),
  placeholderLiteral: count('placeholder="[^{]'),
  labelLiteral: count('label="[A-Za-zÀ-ú]'),
  clinicalSequenceCopyFile: 1,
  clinicalExportCopyFile: 1,
}

console.log(JSON.stringify(metrics, null, 2))
