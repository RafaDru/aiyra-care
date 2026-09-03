/**
 * Valida Dockerfiles preview (build opcional).
 * Uso:
 *   npm run build:preview-images -- --check-only
 *   npm run build:preview-images
 */
import { spawnSync } from 'child_process'
import { existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const checkOnly = process.argv.includes('--check-only')

const images = [
  { name: 'aiyracare-api', file: 'infra/docker/Dockerfile.api', args: [] },
  {
    name: 'aiyracare-web',
    file: 'infra/docker/Dockerfile.web',
    args: [
      '--build-arg', 'VITE_API_URL=http://127.0.0.1:3020',
      '--build-arg', 'VITE_OPS_CONSOLE_URL=http://127.0.0.1:3023',
    ],
  },
  {
    name: 'aiyracare-ops-console',
    file: 'infra/docker/Dockerfile.ops-console',
    args: [],
  },
  {
    name: 'aiyracare-connect-worker',
    file: 'infra/docker/Dockerfile.connect-worker',
    args: [],
  },
]

for (const img of images) {
  const dockerfile = resolve(root, img.file)
  if (!existsSync(dockerfile)) {
    console.error(`missing ${img.file}`)
    process.exit(1)
  }
  console.log(`OK ${img.file}`)
}

if (checkOnly) {
  console.log('build:preview-images --check-only OK')
  process.exit(0)
}

function hasDocker() {
  const r = spawnSync('docker', ['version'], { stdio: 'ignore', shell: true })
  return r.status === 0
}

if (!hasDocker()) {
  console.warn('Docker não disponível — apenas check-only. Rode com Docker para build completo.')
  process.exit(0)
}

for (const img of images) {
  console.log(`\n=== docker build ${img.name} ===`)
  const r = spawnSync(
    'docker',
    ['build', '-f', img.file, '-t', `${img.name}:preview`, ...img.args, '.'],
    { cwd: root, stdio: 'inherit', shell: true },
  )
  if (r.status !== 0) process.exit(r.status ?? 1)
}

console.log('\nbuild:preview-images OK')
