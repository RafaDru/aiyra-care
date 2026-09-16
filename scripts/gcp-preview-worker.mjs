/**
 * Cloud Run Jobs + Scheduler para connect-worker no Preview GCP.
 * Uso: npm run deploy:preview:worker -- --tag <ref>
 * Requer: mesmas env do deploy API + GCP_SA_KEY (CI) ou gcloud auth local.
 *
 * Flags: --dry-run, --jobs-only (sem scheduler), --tag=
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
const jobsOnly = args.includes('--jobs-only')
const tagArg = args.find((a) => a.startsWith('--tag='))?.slice('--tag='.length)
  ?? (args.includes('--tag') ? args[args.indexOf('--tag') + 1] : null)

const projectId = process.env.GCP_PROJECT_ID ?? defaults.projectId
const region = process.env.GCP_REGION ?? defaults.region
const registry = process.env.GCP_ARTIFACT_REGISTRY ?? defaults.artifactRegistry
const jobs = defaults.jobs
const schedules = defaults.schedules

function gitShortSha() {
  const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8', cwd: root })
  return r.status === 0 ? r.stdout.trim() : 'preview'
}

const imageTag = tagArg ?? process.env.IMAGE_TAG ?? gitShortSha()
const registryHost = `${region}-docker.pkg.dev`
const imageBase = `${registryHost}/${projectId}/${registry}`
const workerImage = `${imageBase}/connect-worker:${imageTag}`

function run(cmd, cmdArgs, opts = {}) {
  const line = `${cmd} ${cmdArgs.join(' ')}`
  if (dryRun) {
    console.log(`[dry-run] ${line}`)
    return { status: 0 }
  }
  console.log(`\n> ${line}`)
  return spawnSync(cmd, cmdArgs, { stdio: 'inherit', shell: false, cwd: root, ...opts })
}

function requireEnv(name) {
  const v = process.env[name]?.trim()
  if (!v) {
    console.error(`gcp-preview-worker: ${name} obrigatório`)
    process.exit(1)
  }
  return v
}

function writeEnvYaml(pairs) {
  const path = resolve(root, `.gcp-worker-env-${Date.now()}.yaml`)
  const lines = pairs
    .filter(([, v]) => v != null && String(v).length > 0)
    .map(([k, v]) => `${k}: "${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
  writeFileSync(path, lines.join('\n'), 'utf8')
  return path
}

function workerEnvBase() {
  if (dryRun) {
    return [
      ['DEPLOYMENT_TIER', 'preview'],
      ['DATABASE_URL', 'postgresql://dry-run'],
      ['CONNECT_WORKER_JOB_MODE', 'ops'],
    ]
  }
  return [
    ['DEPLOYMENT_TIER', 'preview'],
    ['DATABASE_URL', requireEnv('DATABASE_URL')],
    ['CRYPTO_KEY', requireEnv('CRYPTO_KEY')],
    ['API_PUBLIC_URL', requireEnv('API_PUBLIC_URL')],
    ['OPS_METRICS_KEY', requireEnv('OPS_METRICS_KEY')],
    ['OPS_ALERT_WEBHOOK_URL', requireEnv('OPS_ALERT_WEBHOOK_URL')],
    ['OPS_ALERT_DASHBOARD_URL', requireEnv('OPS_ALERT_DASHBOARD_URL')],
    ['OPS_ALERTS_DISPATCH_MODE', process.env.OPS_ALERTS_DISPATCH_MODE ?? 'human_required'],
    ['OPS_ALERTS_MIN_SEVERITY', process.env.OPS_ALERTS_MIN_SEVERITY ?? 'critical'],
    ['CONNECT_WORKER_EXTERNAL', '1'],
  ]
}

function deployJob(name, mode) {
  const envFile = writeEnvYaml([...workerEnvBase(), ['CONNECT_WORKER_JOB_MODE', mode]])
  try {
    const create = run('gcloud', [
      'run', 'jobs', 'deploy', name,
      '--image', workerImage,
      '--region', region,
      '--project', projectId,
      '--env-vars-file', envFile,
      '--max-retries', '1',
      '--task-timeout', '900s',
      '--memory', '512Mi',
      '--cpu', '1',
      '--quiet',
    ])
    if (create.status !== 0) process.exit(create.status ?? 1)
  } finally {
    try { unlinkSync(envFile) } catch { /* ignore */ }
  }
}

function deployScheduler(jobName, schedule, schedulerId) {
  const uri = `https://${region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${projectId}/jobs/${jobName}:run`
  const sa = process.env.GCP_SCHEDULER_SA_EMAIL?.trim()
  if (!sa) {
    console.warn(`  scheduler ${schedulerId}: GCP_SCHEDULER_SA_EMAIL não definido — pule ou crie manualmente`)
    return
  }
  run('gcloud', [
    'scheduler', 'jobs', 'create', 'http', schedulerId,
    '--location', region,
    '--schedule', schedule,
    '--uri', uri,
    '--http-method', 'POST',
    '--oauth-service-account-email', sa,
    '--project', projectId,
    '--quiet',
  ])
}

console.log('gcp-preview-worker')
console.log(`  project=${projectId} region=${region} tag=${imageTag}`)

if (!args.includes('--deploy-only')) {
  run('gcloud', ['auth', 'configure-docker', registryHost, '--quiet', '--project', projectId])
  const build = run('docker', [
    'build', '-f', 'infra/docker/Dockerfile.connect-worker',
    '-t', workerImage, '.',
  ])
  if (build.status !== 0) process.exit(build.status ?? 1)
  const push = run('docker', ['push', workerImage])
  if (push.status !== 0) process.exit(push.status ?? 1)
}

deployJob(jobs.workerSync, 'sync')
deployJob(jobs.workerOps, 'ops')

if (!jobsOnly) {
  deployScheduler(jobs.workerSync, schedules.workerSync, 'aiyracare-preview-scheduler-sync')
  deployScheduler(jobs.workerOps, schedules.workerOps, 'aiyracare-preview-scheduler-ops')
}

console.log('\ngcp-preview-worker OK')
console.log('  Teste manual: gcloud run jobs execute', jobs.workerOps, '--region', region)
