/**
 * Deploy Preview (Ambiente 2) no GCP — build/push imagens + Cloud Run.
 *
 * Uso (local ou CI, com gcloud autenticado):
 *   GCP_SA_KEY ou gcloud auth application-default login
 *   npm run deploy:preview:gcp -- --tag v1
 *
 * Env obrigatório (deploy):
 *   GCP_PROJECT_ID, GCP_REGION (ou defaults em infra/gcp/preview.defaults.json)
 *   DATABASE_URL, CRYPTO_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE
 *   API_PUBLIC_URL, OPS_ALERT_DASHBOARD_URL (URLs públicas preview)
 *   OPS_METRICS_KEY, OPS_ALERT_WEBHOOK_URL
 *
 * Env build web:
 *   VITE_API_URL (= API_PUBLIC_URL)
 *   VITE_OPS_CONSOLE_URL (= OPS_ALERT_DASHBOARD_URL)
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 *
 * Flags:
 *   --tag <ref>     tag das imagens (default: git short sha ou 'preview')
 *   --build-only    só build/push
 *   --deploy-only   só deploy (imagens já no registry)
 *   --dry-run       imprime comandos
 */
import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import { spawnSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const defaults = JSON.parse(
  readFileSync(resolve(root, 'infra/gcp/preview.defaults.json'), 'utf8'),
)

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const buildOnly = args.includes('--build-only')
const deployOnly = args.includes('--deploy-only')
const tagArg = args.find((a) => a.startsWith('--tag='))?.slice('--tag='.length)
  ?? (args.includes('--tag') ? args[args.indexOf('--tag') + 1] : null)

const projectId = process.env.GCP_PROJECT_ID ?? defaults.projectId
const region = process.env.GCP_REGION ?? defaults.region
const registry = process.env.GCP_ARTIFACT_REGISTRY ?? defaults.artifactRegistry
const services = defaults.services

function gitShortSha() {
  const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8', cwd: root })
  return r.status === 0 ? r.stdout.trim() : 'preview'
}

const imageTag = tagArg ?? process.env.IMAGE_TAG ?? gitShortSha()
const registryHost = `${region}-docker.pkg.dev`
const imageBase = `${registryHost}/${projectId}/${registry}`

function run(cmd, cmdArgs, opts = {}) {
  const line = `${cmd} ${cmdArgs.join(' ')}`
  if (dryRun) {
    console.log(`[dry-run] ${line}`)
    return { status: 0 }
  }
  console.log(`\n> ${line}`)
  return spawnSync(cmd, cmdArgs, { stdio: 'inherit', shell: false, ...opts })
}

function requireEnv(name) {
  const v = process.env[name]?.trim()
  if (!v) {
    console.error(`gcp-preview-deploy: ${name} obrigatório`)
    process.exit(1)
  }
  return v
}

function writeEnvYaml(pairs) {
  const path = resolve(root, `.gcp-preview-env-${Date.now()}.yaml`)
  const lines = pairs
    .filter(([, v]) => v != null && String(v).length > 0)
    .map(([k, v]) => `${k}: "${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
  writeFileSync(path, lines.join('\n'), 'utf8')
  return path
}

function ensureGcloud() {
  const r = spawnSync('gcloud', ['--version'], { encoding: 'utf8', shell: true })
  if (r.status !== 0) {
    console.error('gcloud CLI não encontrado — instale Google Cloud SDK')
    process.exit(1)
  }
}

function dockerBuild(name, dockerfile, buildArgs = []) {
  const image = `${imageBase}/${name}:${imageTag}`
  const r = run('docker', [
    'build',
    '-f', dockerfile,
    '-t', image,
    ...buildArgs,
    '.',
  ], { cwd: root })
  if (r.status !== 0) process.exit(r.status ?? 1)
  return image
}

function dockerPush(image) {
  const r = run('docker', ['push', image])
  if (r.status !== 0) process.exit(r.status ?? 1)
}

function configureDockerAuth() {
  const r = run('gcloud', [
    'auth', 'configure-docker', `${registryHost}`, '--quiet',
    '--project', projectId,
  ])
  if (r.status !== 0) process.exit(r.status ?? 1)
}

function deployCloudRun(name, image, envPairs, extraArgs = []) {
  const envFile = writeEnvYaml(envPairs)
  try {
    const r = run('gcloud', [
      'run', 'deploy', name,
      '--image', image,
      '--region', region,
      '--project', projectId,
      '--platform', 'managed',
      '--allow-unauthenticated',
      '--port', '8080',
      '--env-vars-file', envFile,
      '--quiet',
      ...extraArgs,
    ])
    if (r.status !== 0) process.exit(r.status ?? 1)
  } finally {
    try { unlinkSync(envFile) } catch { /* ignore */ }
  }
}

console.log('gcp-preview-deploy')
console.log(`  project=${projectId} region=${region} tag=${imageTag}`)

ensureGcloud()

const images = { api: '', web: '', ops: '' }

if (!deployOnly) {
  configureDockerAuth()

  images.api = dockerBuild('api', 'infra/docker/Dockerfile.api')
  dockerPush(images.api)

  const apiPublic = process.env.API_PUBLIC_URL ?? process.env.VITE_API_URL ?? ''
  const opsPublic = process.env.OPS_ALERT_DASHBOARD_URL ?? process.env.VITE_OPS_CONSOLE_URL ?? ''
  const viteSupabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
  const viteSupabaseAnon = process.env.VITE_SUPABASE_ANON_KEY ?? ''

  images.web = dockerBuild('web', 'infra/docker/Dockerfile.web', [
    '--build-arg', `VITE_API_URL=${apiPublic}`,
    '--build-arg', `VITE_OPS_CONSOLE_URL=${opsPublic}`,
    '--build-arg', `VITE_SUPABASE_URL=${viteSupabaseUrl}`,
    '--build-arg', `VITE_SUPABASE_ANON_KEY=${viteSupabaseAnon}`,
  ])
  dockerPush(images.web)

  images.ops = dockerBuild('ops', 'infra/docker/Dockerfile.ops-console')
  dockerPush(images.ops)
}

if (buildOnly) {
  console.log('\ngcp-preview-deploy OK (build-only)')
  process.exit(0)
}

if (deployOnly) {
  images.api = `${imageBase}/api:${imageTag}`
  images.web = `${imageBase}/web:${imageTag}`
  images.ops = `${imageBase}/ops:${imageTag}`
}

const databaseUrl = requireEnv('DATABASE_URL')
const cryptoKey = requireEnv('CRYPTO_KEY')
const supabaseUrl = requireEnv('SUPABASE_URL')
const supabaseServiceRole = requireEnv('SUPABASE_SERVICE_ROLE')
const apiPublicUrl = requireEnv('API_PUBLIC_URL')
const opsMetricsKey = requireEnv('OPS_METRICS_KEY')
const opsWebhook = requireEnv('OPS_ALERT_WEBHOOK_URL')
const opsDashboard = requireEnv('OPS_ALERT_DASHBOARD_URL')

const apiEnv = [
  ['DEPLOYMENT_TIER', 'preview'],
  ['PORT', '8080'],
  ['DATABASE_URL', databaseUrl],
  ['CRYPTO_KEY', cryptoKey],
  ['SUPABASE_URL', supabaseUrl],
  ['SUPABASE_SERVICE_ROLE', supabaseServiceRole],
  ['API_PUBLIC_URL', apiPublicUrl],
  ['CONNECT_WORKER_EXTERNAL', '1'],
  ['OPS_WORKER_MONITOR', '1'],
  ['OPS_METRICS_KEY', opsMetricsKey],
  ['OPS_ALERT_WEBHOOK_URL', opsWebhook],
  ['OPS_ALERT_DASHBOARD_URL', opsDashboard],
  ['OPS_ALERTS_DISPATCH_MODE', process.env.OPS_ALERTS_DISPATCH_MODE ?? 'human_required'],
  ['OPS_ALERTS_MIN_SEVERITY', process.env.OPS_ALERTS_MIN_SEVERITY ?? 'critical'],
  ['COMPLIANCE_GATE_ENABLED', process.env.COMPLIANCE_GATE_ENABLED ?? '0'],
]

const opsEnv = [
  ['DEPLOYMENT_TIER', 'preview'],
  ['PORT', '8080'],
  ['OPS_CONSOLE_PORT', '8080'],
  ['OPS_CONSOLE_HOST', '0.0.0.0'],
  ['DATABASE_URL', databaseUrl],
  ['OPS_METRICS_KEY', opsMetricsKey],
  ['OPS_ALERT_WEBHOOK_URL', opsWebhook],
  ['OPS_ALERT_DASHBOARD_URL', opsDashboard],
]

deployCloudRun(services.api, images.api, apiEnv, ['--memory', '1Gi', '--cpu', '1', '--min-instances', '0', '--max-instances', '2'])
deployCloudRun(services.ops, images.ops, opsEnv, ['--memory', '512Mi', '--cpu', '1', '--min-instances', '0', '--max-instances', '1'])
deployCloudRun(services.web, images.web, [], ['--memory', '256Mi', '--cpu', '1', '--min-instances', '0', '--max-instances', '2'])

console.log('\ngcp-preview-deploy OK')
console.log(`  API  ${services.api}`)
console.log(`  Web  ${services.web}`)
console.log(`  Ops  ${services.ops}`)
console.log('  Próximo: npm run preview:post-deploy (API_PUBLIC_URL do host GCP)')
