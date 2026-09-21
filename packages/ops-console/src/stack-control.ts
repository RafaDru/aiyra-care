import { spawn } from 'child_process'
import { appendFile, readFile } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { FastifyRequest } from 'fastify'

const monorepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const stackScript = resolve(monorepoRoot, 'scripts', 'aiyracare-stack.ps1')
const stackOpsLogPath = resolve(monorepoRoot, 'stack-ops.log')

const opsConsolePort = Number(process.env.OPS_CONSOLE_PORT ?? '3013')

function resolveStackApiPort(): number {
  if (opsConsolePort === 3023) return 3020
  const fromEnv = Number(process.env.PORT ?? '3010')
  return Number.isFinite(fromEnv) ? fromEnv : 3010
}

function resolveStackWebPort(): number {
  if (opsConsolePort === 3023) return 5174
  const fromEnv = Number(process.env.AIYRA_STACK_WEB_PORT ?? '5173')
  return Number.isFinite(fromEnv) ? fromEnv : 5173
}

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
  operationInProgress?: boolean
}

export interface StackLogFileTail {
  file: string
  lines: string[]
  missing?: boolean
  error?: string
}

export interface StackLogsSnapshot {
  checkedAt: string
  operationInProgress: boolean
  deploymentTier: 'integration' | 'preview'
  monorepoRoot: string
  ops: StackLogFileTail
  api: StackLogFileTail
  web: StackLogFileTail
  mobileExpo: StackLogFileTail
}

let busy = false
let lastOperation: { action: StackAction; startedAt: string } | null = null

export function isStackOperationInProgress(): boolean {
  return busy
}

function logSuffixForTier(): string {
  return opsConsolePort === 3023 ? '-preview' : ''
}

async function appendStackOpsLog(line: string): Promise<void> {
  const stamp = new Date().toISOString()
  await appendFile(stackOpsLogPath, `[${stamp}] ${line}\n`, 'utf8').catch(() => undefined)
}

export async function readLogTail(filePath: string, maxLines: number): Promise<StackLogFileTail> {
  try {
    const content = await readFile(filePath, 'utf8')
    const lines = content.split(/\r?\n/).filter((line) => line.length > 0)
    return { file: filePath, lines: lines.slice(-maxLines) }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return { file: filePath, lines: [], missing: true }
    return {
      file: filePath,
      lines: [],
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function getStackLogs(maxLines = 48): Promise<StackLogsSnapshot> {
  const suffix = logSuffixForTier()
  const [ops, api, web, mobileExpo] = await Promise.all([
    readLogTail(stackOpsLogPath, maxLines),
    readLogTail(resolve(monorepoRoot, `api${suffix}.log`), maxLines),
    readLogTail(resolve(monorepoRoot, `web${suffix}.log`), maxLines),
    readLogTail(resolve(monorepoRoot, 'packages/mobile/.expo-lan-log.txt'), maxLines),
  ])
  return {
    checkedAt: new Date().toISOString(),
    operationInProgress: busy,
    deploymentTier: opsConsolePort === 3023 ? 'preview' : 'integration',
    monorepoRoot,
    ops,
    api,
    web,
    mobileExpo,
  }
}

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
        apiPort: resolveStackApiPort(),
        webPort: resolveStackWebPort(),
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
      {
        windowsHide: true,
        env: {
          ...process.env,
          PORT: String(resolveStackApiPort()),
          AIYRA_STACK_WEB_PORT: String(resolveStackWebPort()),
          DEPLOYMENT_TIER: opsConsolePort === 3023 ? 'preview' : (process.env.DEPLOYMENT_TIER ?? 'integration'),
        },
      },
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
  const result = await runStackScript('status')
  return { ...result, operationInProgress: busy }
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
  lastOperation = { action, startedAt: new Date().toISOString() }
  await appendStackOpsLog(`INÍCIO ${action} (ops-console :${opsConsolePort})`)
  try {
    const result = await runStackScript(action)
    await appendStackOpsLog(
      `FIM ${action} — API ${result.status.api.up ? 'UP' : 'DOWN'} · Web ${result.status.web.up ? 'UP' : 'DOWN'}${result.message ? ` — ${result.message}` : ''}`,
    )
    return { ...result, operationInProgress: false }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await appendStackOpsLog(`ERRO ${action} — ${msg}`)
    throw err
  } finally {
    busy = false
    lastOperation = null
  }
}

export function getLastStackOperation(): { action: StackAction; startedAt: string } | null {
  return lastOperation
}

export function isStackControlEnabled(): boolean {
  return process.platform === 'win32'
}
