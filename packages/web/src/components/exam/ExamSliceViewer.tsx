import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react'
import {
  CloseOutlined,
  LeftOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { Button, Progress, Select, Spin, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { loadExamSliceBitmaps, sliceLoadPercent, type SliceLoadProgress } from '../../lib/exam-slice-loader.js'

const { Text } = Typography

const SPEED_MS: Record<string, number> = {
  slow: 400,
  normal: 200,
  fast: 100,
  faster: 50,
}

interface Props {
  open: boolean
  examTitle: string
  documentIds: string[]
  onClose: () => void
}

export function ExamSliceViewer({ open, examTitle, documentIds, onClose }: Props) {
  const { t } = useTranslation()
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bitmapsRef = useRef<ImageBitmap[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [loading, setLoading] = useState(false)
  const [loadProgress, setLoadProgress] = useState<SliceLoadProgress | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<string>('normal')

  const total = documentIds.length
  const ready = bitmapsRef.current.length === total && total > 0 && !loading

  const drawFrame = useCallback((i: number) => {
    const canvas = canvasRef.current
    const bitmap = bitmapsRef.current[i]
    if (!canvas || !bitmap) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const parent = canvas.parentElement
    if (!parent) return
    const w = parent.clientWidth
    const h = parent.clientHeight
    canvas.width = w
    canvas.height = h

    const scale = Math.min(w / bitmap.width, h / bitmap.height)
    const dw = bitmap.width * scale
    const dh = bitmap.height * scale
    const dx = (w - dw) / 2
    const dy = (h - dh) / 2
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(bitmap, dx, dy, dw, dh)
  }, [])

  useEffect(() => {
    if (!open || documentIds.length === 0) return

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    bitmapsRef.current = []
    setLoading(true)
    setLoadError(null)
    setLoadProgress({ phase: 'download', done: 0, total: documentIds.length })
    setIndex(0)
    setPlaying(false)

    loadExamSliceBitmaps(documentIds, setLoadProgress, ac.signal)
      .then((bitmaps) => {
        if (ac.signal.aborted) return
        bitmapsRef.current = bitmaps
        setLoading(false)
        drawFrame(0)
      })
      .catch((err) => {
        if (ac.signal.aborted) return
        setLoadError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })

    return () => {
      ac.abort()
      bitmapsRef.current.forEach((b) => b.close())
      bitmapsRef.current = []
    }
  }, [open, documentIds, drawFrame])

  useEffect(() => {
    if (!open || loading) return
    drawFrame(index)
  }, [index, open, loading, drawFrame])

  useEffect(() => {
    if (playTimerRef.current) clearInterval(playTimerRef.current)
    if (!playing || !ready || total <= 1) {
      playTimerRef.current = null
      return
    }
    const ms = SPEED_MS[speed] ?? SPEED_MS.normal
    playTimerRef.current = setInterval(() => {
      setIndex((i) => (i + 1 >= total ? 0 : i + 1))
    }, ms)
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current)
    }
  }, [playing, ready, total, speed])

  useEffect(() => {
    if (!open) return
    const el = rootRef.current
    if (el?.requestFullscreen) {
      el.requestFullscreen().catch(() => {})
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
      if (document.fullscreenElement === el) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (!ready) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        setPlaying(false)
        setIndex((i) => Math.min(i + 1, total - 1))
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setPlaying(false)
        setIndex((i) => Math.max(i - 1, 0))
      }
      if (e.key === ' ') {
        e.preventDefault()
        setPlaying((p) => !p)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, ready, total, onClose])

  const touchStartX = useRef<number | null>(null)

  const onTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null
  }

  const onTouchEnd = (e: TouchEvent) => {
    if (!ready || touchStartX.current == null) return
    const x = e.changedTouches[0]?.clientX ?? 0
    const delta = x - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 40) return
    setPlaying(false)
    if (delta < 0) setIndex((i) => Math.min(i + 1, total - 1))
    else setIndex((i) => Math.max(i - 1, 0))
  }

  if (!open) return null

  const progressPct = loadProgress ? sliceLoadPercent(loadProgress) : 0
  const phaseLabel = loadProgress?.phase === 'decode'
    ? t('examSliceViewer.phaseDecode')
    : loadProgress?.phase === 'ready'
      ? t('examSliceViewer.phaseReady')
      : t('examSliceViewer.phaseDownload')

  return (
    <div
      ref={rootRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        touchAction: 'none',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        style={{
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
          color: '#fff',
          background: 'rgba(0,0,0,0.85)',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 14 }} ellipsis>
          {examTitle}
        </Text>
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
          style={{ color: '#fff', minWidth: 44, minHeight: 44 }}
          aria-label={t('examSliceViewer.close')}
        />
      </div>

      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              padding: 24,
            }}
          >
            <Spin size="large" />
            <Text style={{ color: '#ccc' }}>{phaseLabel}</Text>
            {loadProgress && (
              <>
                <Progress
                  percent={progressPct}
                  status="active"
                  strokeColor="#4dabf7"
                  style={{ width: 'min(320px, 90vw)' }}
                />
                <Text style={{ color: '#999' }}>
                  {loadProgress.done} / {loadProgress.total}
                </Text>
              </>
            )}
          </div>
        )}
        {loadError && !loading && (
          <div style={{ color: '#ff6b6b', textAlign: 'center', padding: 24 }}>
            {loadError}
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{ display: loading || loadError ? 'none' : 'block', width: '100%', height: '100%' }}
        />
      </div>

      {ready && (
        <div
          style={{
            flex: '0 0 auto',
            padding: '12px 16px',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#aaa', fontSize: 13 }}>
            {index + 1} / {total}
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 420 }}>
            <Button
              type="text"
              icon={<LeftOutlined />}
              onClick={() => { setPlaying(false); setIndex((i) => Math.max(0, i - 1)) }}
              disabled={index <= 0}
              style={{ color: '#fff', minWidth: 52, minHeight: 52, fontSize: 22 }}
              aria-label={t('examSliceViewer.prev')}
            />
            <Button
              type="text"
              icon={playing ? <PauseOutlined /> : <PlayCircleOutlined />}
              onClick={() => setPlaying((p) => !p)}
              style={{ color: '#4dabf7', minWidth: 52, minHeight: 52, fontSize: 28 }}
              aria-label={playing ? t('examSliceViewer.pause') : t('examSliceViewer.play')}
            />
            <Button
              type="text"
              icon={<RightOutlined />}
              onClick={() => { setPlaying(false); setIndex((i) => Math.min(total - 1, i + 1)) }}
              disabled={index >= total - 1}
              style={{ color: '#fff', minWidth: 52, minHeight: 52, fontSize: 22 }}
              aria-label={t('examSliceViewer.next')}
            />
            <Select
              value={speed}
              onChange={setSpeed}
              options={[
                { value: 'slow', label: t('examSliceViewer.speedSlow') },
                { value: 'normal', label: t('examSliceViewer.speedNormal') },
                { value: 'fast', label: t('examSliceViewer.speedFast') },
                { value: 'faster', label: t('examSliceViewer.speedFaster') },
              ]}
              style={{ flex: 1, minWidth: 100 }}
              popupMatchSelectWidth={false}
            />
          </div>
        </div>
      )}
    </div>
  )
}
