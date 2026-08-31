import type { Pool } from 'pg'
import type { OpsProbeSnapshot } from '../../domain/ops/ops-metrics.types.js'
import { writeOpsProbeArtifact } from './ops-probe-artifact.js'

const DEFAULT_API_BASE = 'http://127.0.0.1:3010'
const API_SLOW_MS = Number(process.env.OPS_PROBE_API_SLOW_MS ?? '3000')
const PG_SLOW_MS = Number(process.env.OPS_PROBE_PG_SLOW_MS ?? '500')

async function probeHttp(path: string): Promise<{ ok: boolean; latencyMs: number; status?: number; error?: string }> {
  const base = (process.env.API_PUBLIC_URL ?? DEFAULT_API_BASE).replace(/\/$/, '')
  const start = Date.now()
  try {
    const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(15_000) })
    const latencyMs = Date.now() - start
    return { ok: res.ok, latencyMs, status: res.status }
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

async function probePostgres(pool: Pool): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now()
  try {
    const client = await pool.connect()
    await client.query('SELECT 1 AS ok')
    client.release()
    return { ok: true, latencyMs: Date.now() - start }
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

async function probeNeo4j(): Promise<{ ok: boolean; latencyMs: number; error?: string } | undefined> {
  if (process.env.NEO4J_READ_ENABLED === '0' || process.env.NEO4J_SYNC_ENABLED !== '1') {
    return undefined
  }
  const start = Date.now()
  try {
    const { neo4jDriver } = await import('../../db/neo4j.js')
    await neo4jDriver.verifyConnectivity()
    const session = neo4jDriver.session()
    await session.run('RETURN 1 AS ok')
    await session.close()
    return { ok: true, latencyMs: Date.now() - start }
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function runOpsProbe(pool: Pool): Promise<OpsProbeSnapshot> {
  const apiHealth = await probeHttp('/health')
  const postgres = await probePostgres(pool)
  const neo4j = await probeNeo4j()

  const snapshot: OpsProbeSnapshot = {
    checkedAt: new Date().toISOString(),
    api: apiHealth,
    postgres,
    neo4j,
  }

  writeOpsProbeArtifact(snapshot)
  return snapshot
}

export function isOpsProbeDegraded(snapshot: OpsProbeSnapshot): boolean {
  if (!snapshot.api.ok) return true
  if (!snapshot.postgres.ok) return true
  if (snapshot.api.latencyMs >= API_SLOW_MS) return true
  if (snapshot.postgres.latencyMs >= PG_SLOW_MS) return true
  if (snapshot.neo4j && !snapshot.neo4j.ok) return true
  return false
}
