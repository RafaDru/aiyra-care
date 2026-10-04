import type { OpsAnalysisQueueService } from './ops-analysis-queue.service.js'
import { isInvestigatorCallbackAuthorized } from './ops-analysis-callback-url.js'

export async function postAnalysisQueueTriageStarted(
  service: OpsAnalysisQueueService,
  queueId: string,
  headers: Record<string, string | undefined>,
): Promise<{ statusCode: number; body: Record<string, unknown> }> {
  if (!isInvestigatorCallbackAuthorized(headers)) {
    return { statusCode: 401, body: { error: 'unauthorized' } }
  }
  const result = await service.markTriageStarted(queueId)
  if (!result.ok) {
    if (result.error === 'not_found') {
      return { statusCode: 404, body: { error: 'not_found' } }
    }
    return {
      statusCode: 409,
      body: { error: result.error, message: result.message },
    }
  }
  return {
    statusCode: 200,
    body: {
      ok: true,
      incidentPipelineStatus: result.incidentPipelineStatus,
      ...(result.noop ? { noop: true } : {}),
    },
  }
}
