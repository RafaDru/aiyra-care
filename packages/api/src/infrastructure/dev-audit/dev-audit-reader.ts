import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { DevAuditKind, DevAuditRecord } from '../../domain/ops/dev-audit-bridge.types.js'
import { parseDevAuditJsonlLine } from '../../domain/ops/dev-audit-bridge.js'

const KINDS: DevAuditKind[] = ['sessions', 'edits', 'shell', 'tools']

function dayFromFile(name: string): string | null {
  const m = name.match(/^(\d{4}-\d{2}-\d{2})\.jsonl$/)
  return m ? m[1] : null
}

export function loadDevAuditRecords(
  auditRoot: string,
  since: Date,
  until: Date,
): DevAuditRecord[] {
  const out: DevAuditRecord[] = []
  const sinceMs = since.getTime()
  const untilMs = until.getTime()

  for (const kind of KINDS) {
    const dir = join(auditRoot, kind)
    if (!existsSync(dir)) continue
    for (const file of readdirSync(dir)) {
      const day = dayFromFile(file)
      if (!day) continue
      const dayStart = new Date(`${day}T00:00:00.000Z`).getTime()
      const dayEnd = dayStart + 86_400_000
      if (dayEnd < sinceMs || dayStart > untilMs) continue

      const content = readFileSync(join(dir, file), 'utf8')
      for (const line of content.split(/\r?\n/)) {
        const rec = parseDevAuditJsonlLine(line, kind)
        if (!rec?.ts) continue
        const ts = new Date(rec.ts).getTime()
        if (Number.isNaN(ts) || ts < sinceMs || ts > untilMs) continue
        out.push(rec)
      }
    }
  }

  return out.sort((a, b) => a.ts.localeCompare(b.ts))
}
