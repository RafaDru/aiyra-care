import { spawn } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { FastifyRequest } from 'fastify'

const monorepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const stackScript = resolve(monorepoRoot, 'scripts', 'aiyracare-stack.ps1')

export type StackAction = 'status' | 'start' | 'stop' | 'restart'

export interface StackServiceStatus {
  up: boolean
  status: number | null
  error?: string | null
  service?: string
  healthStatus?: string
}

export interface StackStatusSnapshot {
  checkedAt: string
  apiPort: number
  webPort: number
  api: StackServiceStatus
  web: StackServiceStatus
}

export interface StackActionResult {
  action: StackAction
  message?: string
  status: StackStatusSnapshot
  platform?: string
  error?: string
}

let busy = false

function assertStackAuth(req: FastifyRequest): void {
  const key = process.env.OPS_CONSOLE_STACK_KEY?.trim()
  if (!key) return
  const header =
    req.headers['x-ops-stack-key'] ??
    req.headers['x-internal-ops-key']
  if (typeof header !== 'string' || header !== key) {
    throw new Error('Chave ops inválida')
  }
}

function runStackScript(action: StackAction): Promise<StackActionResult> {
  if (process.platform !== 'win32') {
    return Promise.resolve({
      action,
      error: 'Controle do stack disponível apenas em Windows (dev local)',
      status: {
        checkedAt: new Date().toISOString(),
        apiPort: Number(process.env.PORT ?? 3010),
        webPort: 5173,
        api: { up: false, status: null, error: 'unsupported_platform' },
        web: { up: false, status: null, error: 'unsupported_platform' },
      },
      platform: process.platform,
    })
  }

  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      'powershell',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        stackScript,
        '-Action',
        action,
        '-Json',
      ],
      { windowsHide: true },
    )

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += String(chunk) })
    child.stderr.on('data', (chunk) => { stderr += String(chunk) })

    child.on('error', (err) => reject(err))
    child.on('close', (code) => {
      const trimmed = stdout.trim()
      if (code !== 0 && !trimmed) {
        reject(new Error(stderr.trim() || `stack script exit ${code}`))
        return
      }
      try {
        const parsed = JSON.parse(trimmed) as StackActionResult
        resolvePromise({ ...parsed, platform: 'win32' })
      } catch {
        reject(new Error(stderr.trim() || 'Resposta inválida do script de stack'))
      }
    })
  })
}

export async function getStackStatus(): Promise<StackActionResult> {
  return runStackScript('status')
}

export async function runStackAction(
  req: FastifyRequest,
  action: StackAction,
): Promise<StackActionResult> {
  assertStackAuth(req)
  if (busy) {
    throw new Error('Operação de stack em andamento — aguarde')
  }
  busy = true
  try {
    return await runStackScript(action)
  } finally {
    busy = false
  }
}

export function isStackControlEnabled(): boolean {
  return process.platform === 'win32'
}
