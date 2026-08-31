import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
export const FLEURY_PROBE_OUTPUT_DIR = path.resolve(scriptsDir, '../output')
export const FLEURY_PROBE_ARTIFACT_PATH = path.join(FLEURY_PROBE_OUTPUT_DIR, 'fleury-precision-probe.json')

export async function writeFleuryProbeArtifact(payload) {
  await mkdir(FLEURY_PROBE_OUTPUT_DIR, { recursive: true })
  const artifact = {
    capturedAt: new Date().toISOString(),
    ...payload,
  }
  await writeFile(FLEURY_PROBE_ARTIFACT_PATH, JSON.stringify(artifact, null, 2), 'utf8')
  return FLEURY_PROBE_ARTIFACT_PATH
}

export async function readFleuryProbeArtifact() {
  const { readFile } = await import('fs/promises')
  const raw = await readFile(FLEURY_PROBE_ARTIFACT_PATH, 'utf8')
  return JSON.parse(raw)
}
