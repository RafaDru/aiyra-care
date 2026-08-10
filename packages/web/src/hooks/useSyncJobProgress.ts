import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api.js'
import { openSyncJobStream, type SyncProgressStreamPayload } from '../lib/sync-job-stream.js'
import {
  fetchGroupHasFailure,
  getSyncPortalProfile,
  resolveSyncStepIndex,
  type SyncablePortalType,
} from '../lib/sync-portal-profile.js'
import {
  isFatalSyncJobFailure,
  isSyncJobFinished,
  SYNC_FALLBACK_CHECK_MS,
  SYNC_LONG_RUNNING_HINT_MS,
  SYNC_POLL_MS,
  SYNC_STREAM_STALE_MS,
  type SyncJobOverallStatus,
  type SyncJobProgressResult,
  type SyncStepDetail,
} from '../lib/sync-job-progress.js'

const DEFAULT_PORTAL: SyncablePortalType = 'unimed'

function applyProgressPayload(
  p: SyncProgressStreamPayload,
  portalTypeHint: SyncablePortalType | null | undefined,
  finishedRef: { current: boolean },
  setters: {
    setResolvedPortal: (v: SyncablePortalType) => void
    setMessage: (v: string) => void
    setStepDetails: (v: Record<string, SyncStepDetail>) => void
    setCurrentStep: (v: number) => void
    setStatus: (v: SyncJobOverallStatus) => void
    setResult: (v: SyncJobProgressResult | null) => void
  },
  onTerminalRef: { current?: (status: SyncJobOverallStatus, message: string) => void },
): boolean {
  if (finishedRef.current) return true
  if (p.event === 'heartbeat') return false

  if (p.portalType) setters.setResolvedPortal(p.portalType as SyncablePortalType)
  if (p.message) setters.setMessage(p.message)
  if (p.stepDetails) setters.setStepDetails(p.stepDetails as Record<string, SyncStepDetail>)

  const portal = (p.portalType as SyncablePortalType | undefined) ?? portalTypeHint ?? DEFAULT_PORTAL
  const details = (p.stepDetails ?? {}) as Record<string, SyncStepDetail>
  setters.setCurrentStep(resolveSyncStepIndex(p.step, portal, details))

  if (isFatalSyncJobFailure(p.step, p.status)) {
    finishedRef.current = true
    const msg = p.message || 'Erro na sincronização'
    setters.setStatus('failed')
    setters.setMessage(msg)
    onTerminalRef.current?.('failed', msg)
    return true
  }

  if (isSyncJobFinished(p as { step: string; status: string; result?: SyncJobProgressResult })) {
    finishedRef.current = true
    const activeProfile = getSyncPortalProfile(portal)
    const partial = ((p.result?.warnings?.length ?? 0) > 0)
      || fetchGroupHasFailure(details, activeProfile)
    const terminal: SyncJobOverallStatus = partial ? 'partial' : 'success'
    setters.setStatus(terminal)
    setters.setCurrentStep(activeProfile.mainSteps.length - 1)
    if (p.result !== undefined) {
      setters.setResult(p.result as unknown as SyncJobProgressResult)
    }
    if (p.stepDetails) setters.setStepDetails(p.stepDetails as Record<string, SyncStepDetail>)
    onTerminalRef.current?.(terminal, p.message || '')
    return true
  }

  return false
}

export function useSyncJobProgress(
  jobId: string | null,
  portalTypeHint?: SyncablePortalType | null,
  onTerminal?: (status: SyncJobOverallStatus, message: string) => void,
) {
  const [resolvedPortal, setResolvedPortal] = useState<SyncablePortalType>(portalTypeHint ?? DEFAULT_PORTAL)
  const [currentStep, setCurrentStep] = useState(0)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<SyncJobOverallStatus>('running')
  const [result, setResult] = useState<SyncJobProgressResult | null>(null)
  const [stepDetails, setStepDetails] = useState<Record<string, SyncStepDetail>>({})
  const [longRunning, setLongRunning] = useState(false)
  const finishedRef = useRef(false)
  const startedAtRef = useRef(0)
  const lastEventAtRef = useRef(0)
  const onTerminalRef = useRef(onTerminal)
  onTerminalRef.current = onTerminal

  useEffect(() => {
    if (portalTypeHint) setResolvedPortal(portalTypeHint)
  }, [portalTypeHint])

  useEffect(() => {
    if (!jobId) return
    finishedRef.current = false
    startedAtRef.current = Date.now()
    lastEventAtRef.current = Date.now()
    setCurrentStep(0)
    setMessage('Iniciando...')
    setStatus('running')
    setResult(null)
    setStepDetails({})
    setLongRunning(false)
    if (portalTypeHint) setResolvedPortal(portalTypeHint)

    let cancelled = false
    const setters = {
      setResolvedPortal,
      setMessage,
      setStepDetails,
      setCurrentStep,
      setStatus,
      setResult,
    }

    const onStreamPayload = (p: SyncProgressStreamPayload) => {
      if (cancelled) return
      lastEventAtRef.current = Date.now()
      applyProgressPayload(p, portalTypeHint, finishedRef, setters, onTerminalRef)
    }

    const closeStream = openSyncJobStream(
      jobId,
      onStreamPayload,
      () => {
        if (!cancelled && !finishedRef.current) lastEventAtRef.current = 0
      },
    )

    const reconcile = async () => {
      if (cancelled || finishedRef.current) return
      try {
        const p = await api.integrationLinks.syncProgress(jobId)
        if (cancelled || finishedRef.current) return
        lastEventAtRef.current = Date.now()
        applyProgressPayload(
          { ...p, event: 'snapshot' },
          portalTypeHint,
          finishedRef,
          setters,
          onTerminalRef,
        )
      } catch {
        // reconciliação falhou — próximo ciclo ou reconnect
      }
    }

    void reconcile()

    const staleCheck = window.setInterval(() => {
      if (cancelled || finishedRef.current) return
      if (Date.now() - startedAtRef.current > SYNC_LONG_RUNNING_HINT_MS) {
        setLongRunning(true)
      }
      const staleFor = Date.now() - lastEventAtRef.current
      if (lastEventAtRef.current > 0 && staleFor > SYNC_STREAM_STALE_MS) {
        void reconcile()
      }
    }, SYNC_FALLBACK_CHECK_MS)

    return () => {
      cancelled = true
      closeStream()
      window.clearInterval(staleCheck)
    }
  }, [jobId, portalTypeHint])

  return {
    portalType: resolvedPortal,
    currentStep,
    message,
    status,
    result,
    stepDetails,
    longRunning,
    profile: getSyncPortalProfile(resolvedPortal),
  }
}
