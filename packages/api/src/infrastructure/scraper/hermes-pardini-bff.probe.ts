import type { APIRequestContext } from 'playwright'
import {
  fetchHermesPardiniExams,
  type HermesPardiniBffFetchResult,
  type HermesPardiniExamItem,
} from './hermes-pardini-bff.service.js'

export type HermesPardiniExamProbeItem = HermesPardiniExamItem

export type HermesPardiniBffProbeResult = HermesPardiniBffFetchResult & {
  discoveredPath?: string
}

/** @deprecated use fetchHermesPardiniExams — mantido para scripts legados. */
export async function probeHermesPardiniExams(
  request: APIRequestContext,
  accessToken: string,
  opts?: { startDate?: string; endDate?: string },
): Promise<HermesPardiniBffProbeResult> {
  const result = await fetchHermesPardiniExams(request, accessToken, opts)
  return {
    ...result,
    discoveredPath: '/pedidos',
  }
}
