export interface IncidentDefectCycleMetrics {
  windowDays: number
  generatedAt: string
  incidents: {
    /** INC ainda na fila operacional (não resolved/dismissed). */
    open: number
    /** INC marcados resolved na janela. */
    resolvedInWindow: number
  }
  defects: {
    inFix: number
    awaitingMerge: number
    fixedInWindow: number
    /** Média first_seen → fixed_at na janela (dias). */
    avgDaysToFixed: number | null
  }
}
