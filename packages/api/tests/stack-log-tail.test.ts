import { mkdtemp, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { describe, expect, it } from 'vitest'
import { readLogTail } from '../../ops-console/src/stack-control.js'

describe('readLogTail', () => {
  it('returns last N non-empty lines', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'stack-log-'))
    const file = join(dir, 'sample.log')
    await writeFile(file, ['line1', 'line2', 'line3', 'line4'].join('\n'), 'utf8')
    const tail = await readLogTail(file, 2)
    expect(tail.lines).toEqual(['line3', 'line4'])
  })

  it('marks missing files', async () => {
    const tail = await readLogTail(join(tmpdir(), 'missing-stack-log.log'), 5)
    expect(tail.missing).toBe(true)
    expect(tail.lines).toEqual([])
  })
})
