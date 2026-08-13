import { describe, expect, it } from 'vitest'
import { createLegalContentPort } from '../src/infrastructure/legal-compliance/legal-content.factory.js'
import { FsLegalContentAdapter } from '../src/infrastructure/legal-compliance/fs-legal-content.adapter.js'

describe('createLegalContentPort', () => {
  it('defaults to filesystem adapter', () => {
    const prev = process.env.LEGAL_CONTENT_ADAPTER
    delete process.env.LEGAL_CONTENT_ADAPTER
    const port = createLegalContentPort()
    expect(port).toBeInstanceOf(FsLegalContentAdapter)
    process.env.LEGAL_CONTENT_ADAPTER = prev
  })
})
