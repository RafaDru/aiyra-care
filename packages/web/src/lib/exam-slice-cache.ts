/** Cache local de cortes de exame (IndexedDB) — apenas desktop. */

const DB_NAME = 'openhealth-exam-slices'
const STORE = 'slices'
const MAX_ENTRIES = 12
const DESKTOP_MIN_WIDTH = 1024

function isDesktopCacheEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`).matches
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'documentId' })
        store.createIndex('accessedAt', 'accessedAt')
      }
    }
  })
}

async function pruneOldEntries(db: IDBDatabase): Promise<void> {
  const tx = db.transaction(STORE, 'readwrite')
  const store = tx.objectStore(STORE)
  const index = store.index('accessedAt')
  const all = await new Promise<Array<{ documentId: string; accessedAt: number }>>((resolve, reject) => {
    const req = index.getAll()
    req.onsuccess = () => resolve(req.result as Array<{ documentId: string; accessedAt: number }>)
    req.onerror = () => reject(req.error)
  })
  if (all.length <= MAX_ENTRIES * 200) return
  const sorted = [...all].sort((a, b) => a.accessedAt - b.accessedAt)
  const toDrop = sorted.slice(0, sorted.length - MAX_ENTRIES * 200)
  for (const row of toDrop) {
    store.delete(row.documentId)
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getCachedSliceBlob(documentId: string): Promise<Blob | null> {
  if (!isDesktopCacheEnabled()) return null
  try {
    const db = await openDb()
    const row = await new Promise<{ blob: Blob } | undefined>((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(documentId)
      req.onsuccess = () => resolve(req.result as { blob: Blob } | undefined)
      req.onerror = () => reject(req.error)
    })
    if (!row?.blob) return null
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ documentId, blob: row.blob, accessedAt: Date.now() })
    return row.blob
  } catch {
    return null
  }
}

export async function putCachedSliceBlob(documentId: string, blob: Blob): Promise<void> {
  if (!isDesktopCacheEnabled()) return
  try {
    const db = await openDb()
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ documentId, blob, accessedAt: Date.now() })
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    await pruneOldEntries(db)
  } catch {
    // cache opcional
  }
}

export function examSliceCacheEnabled(): boolean {
  return isDesktopCacheEnabled()
}
