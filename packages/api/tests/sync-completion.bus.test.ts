import { describe, expect, it, vi } from 'vitest'
import {
  bindSyncCompletionNotifier,
  publishSyncCompletion,
  subscribePatientSyncCompletions,
} from '../src/infrastructure/sync/sync-completion.bus.js'

describe('sync-completion.bus', () => {
  it('notifies patient subscribers on publish', () => {
    const events: string[] = []
    const unsub = subscribePatientSyncCompletions('patient-1', (e) => {
      events.push(`${e.portalType}:${e.status}`)
    })

    publishSyncCompletion({
      jobId: 'job-1',
      integrationLinkId: 'link-1',
      patientId: 'patient-1',
      portalType: 'unimed',
      status: 'success',
      trigger: 'scheduled',
      finishedAt: new Date().toISOString(),
    })

    expect(events).toEqual(['unimed:success'])
    unsub()
  })

  it('bindSyncCompletionNotifier enriches and publishes', async () => {
    bindSyncCompletionNotifier(async (event) => {
      publishSyncCompletion({ ...event, patientId: 'patient-2' })
    })

    const received: string[] = []
    const unsub = subscribePatientSyncCompletions('patient-2', (e) => {
      received.push(e.jobId)
    })

    await import('../src/infrastructure/sync/sync-completion.bus.js').then((m) =>
      m.notifySyncJobTerminal({
        jobId: 'job-2',
        integrationLinkId: 'link-2',
        portalType: 'amil',
        status: 'failed',
        trigger: 'manual',
        finishedAt: new Date().toISOString(),
      }),
    )

    expect(received).toEqual(['job-2'])
    unsub()
  })
})
