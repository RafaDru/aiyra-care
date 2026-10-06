export type FailureProbeKind =
  | 'ui.unhandled'
  | 'ui.promise'
  | 'api.unexpected'
  | 'api.client'
  | 'companion.stream'

export interface FailureProbeTelemetryMeta {
  probe_version: string
  probe_kind: FailureProbeKind
  declared: 0 | 1
  sdk_surface: 'web'
}
