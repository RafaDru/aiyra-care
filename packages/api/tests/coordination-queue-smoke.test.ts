import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('coordination queue smoke', () => {
  it('docs/coordination/BACKEND_TASK_QUEUE.md exists in the monorepo', () => {
    const queuePath = fileURLToPath(
      new URL('../../../docs/coordination/BACKEND_TASK_QUEUE.md', import.meta.url),
    )
    expect(existsSync(queuePath)).toBe(true)
  })
})
