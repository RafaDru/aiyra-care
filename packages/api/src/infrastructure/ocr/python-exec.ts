import { execFile, type ExecFileOptions } from 'child_process'

const PYTHON_UTF8_ENV = {
  PYTHONUTF8: '1',
  PYTHONIOENCODING: 'utf-8',
} as const

export function decodePythonStdout(stdout: string | Buffer): string {
  if (Buffer.isBuffer(stdout)) return stdout.toString('utf8')
  return stdout
}

export function runPythonScript(
  args: string[],
  options: Omit<ExecFileOptions, 'encoding'> & { timeout?: number; maxBuffer?: number },
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'python',
      args,
      {
        ...options,
        env: { ...process.env, ...PYTHON_UTF8_ENV, ...options.env },
        maxBuffer: options.maxBuffer ?? 8 * 1024 * 1024,
      },
      (err, stdout, stderr) => {
        const out = decodePythonStdout(stdout).trim()
        if (err) {
          const detail = out || (stderr ? decodePythonStdout(stderr).trim() : '') || err.message
          return reject(new Error(detail))
        }
        resolve(out)
      },
    )
  })
}
