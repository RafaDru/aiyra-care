import { documentDownloadUrl } from './api.js'
import { getCachedSliceBlob, putCachedSliceBlob } from './exam-slice-cache.js'

const FETCH_CONCURRENCY = 10

export interface SliceLoadProgress {
  phase: 'download' | 'decode' | 'ready'
  done: number
  total: number
}

async function fetchSliceBlob(documentId: string, signal?: AbortSignal): Promise<Blob> {
  const cached = await getCachedSliceBlob(documentId)
  if (cached) return cached
  const res = await fetch(documentDownloadUrl(documentId), { signal })
  if (!res.ok) throw new Error(`Falha ao baixar corte (${res.status})`)
  const blob = await res.blob()
  await putCachedSliceBlob(documentId, blob)
  return blob
}

export async function loadExamSliceBitmaps(
  documentIds: string[],
  onProgress: (p: SliceLoadProgress) => void,
  signal?: AbortSignal,
): Promise<ImageBitmap[]> {
  const total = documentIds.length
  if (total === 0) return []

  const bitmaps: ImageBitmap[] = new Array(total)
  let downloaded = 0
  let decoded = 0

  const report = () => {
    if (decoded < total) {
      onProgress({
        phase: decoded < downloaded ? 'decode' : 'download',
        done: decoded < downloaded ? decoded : downloaded,
        total,
      })
    }
  }

  const queue = documentIds.map((id, index) => ({ id, index }))

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift()
      if (!item) break
      const blob = await fetchSliceBlob(item.id, signal)
      downloaded += 1
      report()
      bitmaps[item.index] = await createImageBitmap(blob)
      decoded += 1
      report()
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(FETCH_CONCURRENCY, total) }, () => worker()),
  )

  onProgress({ phase: 'ready', done: total, total })
  return bitmaps
}

/** Progresso unificado 0–100 para barra (download ~45%, decode ~45%, ready 100%). */
export function sliceLoadPercent(p: SliceLoadProgress): number {
  if (p.total === 0) return 100
  if (p.phase === 'ready') return 100
  const half = p.total
  if (p.phase === 'download') return Math.round((p.done / half) * 45)
  return 45 + Math.round((p.done / half) * 45)
}
