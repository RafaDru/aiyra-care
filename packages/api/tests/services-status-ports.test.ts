import { describe, expect, it } from 'vitest'
import { resolveMonitoredPorts } from '../../ops-console/src/services-status.js'

describe('resolveMonitoredPorts', () => {
  it('uses preview local ports when console listens on 3023', () => {
    expect(resolveMonitoredPorts(3023)).toEqual({ apiPort: 3020, webPort: 5174 })
  })

  it('does not treat Cloud Run ops port 8080 as preview stack', () => {
    const { apiPort, webPort } = resolveMonitoredPorts(8080)
    expect(apiPort).not.toBe(3020)
    expect(webPort).not.toBe(5174)
  })
})
