import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const queuePath = fileURLToPath(
  new URL('../../../docs/coordination/BACKEND_TASK_QUEUE.md', import.meta.url),
)

describe('coordination queue smoke', () => {
  it('docs/coordination/BACKEND_TASK_QUEUE.md exists in the monorepo', () => {
    expect(existsSync(queuePath)).toBe(true)
  })

  it('queue markdown has no unresolved merge conflict markers', () => {
    const text = readFileSync(queuePath, 'utf8')
    expect(text).not.toMatch(/^<<<<<<< /m)
    expect(text).not.toMatch(/^=======\s*$/m)
    expect(text).not.toMatch(/^>>>>>>> /m)
  })

  it('documents handoff smoke task id format TASK-YYYYMMDD-NN', () => {
    const text = readFileSync(queuePath, 'utf8')
    expect(text).toMatch(/\| TASK-\d{8}-\d{2} \|/)
  })
})
