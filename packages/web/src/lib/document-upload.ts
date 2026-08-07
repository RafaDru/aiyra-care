import type { Document_ } from './api.types.js'

const BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'http://127.0.0.1:3010')

export type DocumentUploadPhase = 'upload' | 'processing' | 'done' | 'failed'

export interface DocumentUploadProgress {
  phase: DocumentUploadPhase
  uploadPercent?: number
  message?: string
}

export function uploadDocumentWithProgress(
  patientId: string,
  documentType: string,
  file: File,
  onProgress: (p: DocumentUploadProgress) => void,
): Promise<Document_> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('patientId', patientId)
    form.append('documentType', documentType)
    form.append('file', file, file.name)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE_URL}/documents/upload`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.min(100, Math.round((e.loaded / e.total) * 100))
        onProgress({ phase: 'upload', uploadPercent: pct, message: `Enviando… ${pct}%` })
      }
    }

    xhr.upload.onload = () => {
      onProgress({
        phase: 'processing',
        uploadPercent: 100,
        message: 'Extraindo texto (OCR)…',
      })
    }

    xhr.onload = () => {
      const text = xhr.responseText
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const doc = JSON.parse(text) as Document_
          onProgress({ phase: 'done', message: 'Processamento concluído' })
          resolve(doc)
        } catch {
          reject(new Error('Resposta inválida do servidor'))
        }
        return
      }
      try {
        const body = JSON.parse(text) as { message?: string }
        reject(new Error(body.message || `HTTP ${xhr.status}`))
      } catch {
        reject(new Error(`HTTP ${xhr.status}`))
      }
    }

    xhr.onerror = () => reject(new Error('Falha na conexão durante o upload'))
    xhr.ontimeout = () => reject(new Error('Tempo esgotado no upload'))

    xhr.timeout = 10 * 60 * 1000
    onProgress({ phase: 'upload', uploadPercent: 0, message: 'Iniciando envio…' })
    xhr.send(form)
  })
}
