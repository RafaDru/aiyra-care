import { describe, expect, it, vi } from 'vitest'
import Fastify from 'fastify'
import { registerClientErrorIncidentErrorHandler } from '../src/infrastructure/http/client-error-incident-bridge.plugin.js'

describe('registerClientErrorIncidentErrorHandler', () => {
  it('invokes bridge on 5xx and returns generic body', async () => {
    const handleServerError = vi.fn(async () => undefined)
    const bridge = {
      isEnabled: () => true,
      handleServerError,
    }

    const app = Fastify({ logger: false })
    registerClientErrorIncidentErrorHandler(app, bridge as never)

    app.get('/auth/boom', async () => {
      const err = new Error('secret detail') as Error & { statusCode?: number }
      err.statusCode = 500
      throw err
    })

    await app.ready()
    const res = await app.inject({ method: 'GET', url: '/auth/boom' })
    expect(res.statusCode).toBe(500)
    expect(res.json()).toMatchObject({ statusCode: 500, message: 'Internal Server Error' })
    expect(handleServerError).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/auth/boom', statusCode: 500 }),
    )
    await app.close()
  })
})
