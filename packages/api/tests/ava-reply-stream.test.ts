import { describe, expect, it } from 'vitest'
import { chunkReplyForSse } from '../../src/domain/llm/ava-reply-stream.js'

describe('chunkReplyForSse', () => {
  it('splits text into fixed-size chunks', () => {
    const text = 'a'.repeat(100)
    const chunks = chunkReplyForSse(text, 30)
    expect(chunks).toHaveLength(4)
    expect(chunks.join('')).toBe(text)
  })

  it('returns empty for empty input', () => {
    expect(chunkReplyForSse('')).toEqual([])
  })
})
