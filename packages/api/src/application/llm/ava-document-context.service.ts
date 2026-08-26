import type { Pool } from 'pg'
import type { DocumentRepository } from '../../domain/document/document.repository.js'

const TEXT_MAX = 6000

function truncate(text: string, max = TEXT_MAX): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

export class AvaDocumentContextService {
  constructor(
    private readonly documents: DocumentRepository,
    private readonly pool: Pool,
  ) {}

  async buildAttachmentBlock(patientId: string, documentId: string): Promise<string> {
    const doc = await this.documents.findById(documentId)
    if (!doc) throw new Error('AVA_ATTACHMENT_NOT_FOUND')
    if (doc.patientId !== patientId) throw new Error('AVA_ATTACHMENT_PATIENT_MISMATCH')

    const { rows } = await this.pool.query(
      `SELECT interpretation_json FROM documents WHERE id = $1`,
      [documentId],
    )
    const interpretation = rows[0]?.interpretation_json ?? null

    const parts = [
      'DOCUMENTO ANEXADO NA CONVERSA (use como contexto adicional — pode complementar o prontuário):',
      `Arquivo: ${doc.originalFilename}`,
      `Tipo: ${doc.documentType}`,
    ]

    if (doc.extractedText?.trim()) {
      parts.push(`Texto extraído (OCR):\n${truncate(doc.extractedText.trim())}`)
    } else {
      parts.push('Texto extraído: ainda não disponível — descreva o que o responsável enviou e peça detalhes se necessário.')
    }

    if (interpretation && typeof interpretation === 'object') {
      parts.push(`Interpretação prévia (JSON):\n${truncate(JSON.stringify(interpretation, null, 2), 3000)}`)
    }

    return parts.join('\n')
  }
}
