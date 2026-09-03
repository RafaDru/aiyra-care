/**
 * Provisionamento one-time GCP Preview (Artifact Registry + APIs).
 * Uso: npm run provision:preview:gcp -- --dry-run
 */
import { readFileSync } from 'fs'
import { spawnSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const defaults = JSON.parse(
  readFileSync(resolve(root, 'infra/gcp/preview.defaults.json'), 'utf8'),
)

const dryRun = process.argv.includes('--dry-run')
const projectId = process.env.GCP_PROJECT_ID ?? defaults.projectId
const region = process.env.GCP_REGION ?? defaults.region
const registry = process.env.GCP_ARTIFACT_REGISTRY ?? defaults.artifactRegistry

const steps = [
  ['gcloud', ['services', 'enable', 'run.googleapis.com', 'artifactregistry.googleapis.com', 'sqladmin.googleapis.com', '--project', projectId]],
  ['gcloud', ['artifacts', 'repositories', 'create', registry, '--repository-format=docker', `--location=${region}`, '--project', projectId]],
]

console.log(`provision:preview:gcp project=${projectId} region=${region}`)

for (const [cmd, args] of steps) {
  const line = `${cmd} ${args.join(' ')}`
  if (dryRun) {
    console.log(`[dry-run] ${line}`)
    continue
  }
  console.log(`\n> ${line}`)
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: false })
  if (r.status !== 0) {
    console.warn(`  (pode já existir — verifique no console GCP)`)
  }
}

console.log('\nprovision:preview:gcp done')
console.log('  Configure secrets no GitHub Environment preview')
console.log('  Depois: npm run deploy:preview:gcp -- --tag main')
