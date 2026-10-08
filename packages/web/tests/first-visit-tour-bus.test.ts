import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('first-visit-tour-bus', () => {
  beforeEach(() => {
    vi.stubGlobal('window', new EventTarget())
    vi.resetModules()
  })

  it('passes force option to subscribers', async () => {
    const { requestFirstVisitTourOpen, subscribeFirstVisitTourOpen } = await import(
      '../src/lib/first-visit-tour-bus.js'
    )
    const handler = vi.fn()
    subscribeFirstVisitTourOpen(handler)
    requestFirstVisitTourOpen({ force: true })
    expect(handler).toHaveBeenCalledWith({ force: true })
  })
})
