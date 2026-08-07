export type DocumentUploadStepKey = 'upload' | 'ocr' | 'identity' | 'done'

export interface DocumentUploadStepDef {
  key: DocumentUploadStepKey
  title: string
  description?: string
}

const IDENTITY_TYPES = new Set(['certidao_nascimento', 'rg', 'cpf_card', 'cnh'])
const HANDWRITING_TYPES = new Set(['prescription', 'exam', 'report'])

export function uploadStepsForDocumentType(documentType: string): DocumentUploadStepDef[] {
  if (IDENTITY_TYPES.has(documentType)) {
    return [
      { key: 'upload', title: 'Enviando arquivo', description: 'Transferindo imagem ou PDF ao servidor' },
      { key: 'ocr', title: 'Extraindo texto (OCR)', description: 'Tesseract — documentos impressos' },
      { key: 'identity', title: 'Detectando dados', description: 'CPF, nome e data de nascimento' },
      { key: 'done', title: 'Concluído', description: 'Revise e confirme os dados' },
    ]
  }
  if (HANDWRITING_TYPES.has(documentType)) {
    return [
      { key: 'upload', title: 'Enviando arquivo' },
      { key: 'ocr', title: 'OCR local', description: 'TrOCR / Tesseract para manuscrito' },
      { key: 'done', title: 'Pronto para revisão', description: 'Confira o texto ou use interpretação por IA' },
    ]
  }
  return [
    { key: 'upload', title: 'Enviando arquivo' },
    { key: 'ocr', title: 'Extraindo texto', description: 'OCR local (Tesseract)' },
    { key: 'done', title: 'Pronto para revisão', description: 'Marqueções na imagem quando disponível' },
  ]
}

export function stepIndexForPhase(
  steps: DocumentUploadStepDef[],
  phase: 'upload' | 'processing' | 'done' | 'failed',
  uploadPct: number,
): number {
  if (phase === 'failed') return steps.length - 1
  if (phase === 'done') return steps.length - 1
  if (phase === 'processing') {
    const ocrIdx = steps.findIndex((s) => s.key === 'ocr')
    return ocrIdx >= 0 ? ocrIdx : 1
  }
  // upload phase
  if (uploadPct >= 100) {
    const ocrIdx = steps.findIndex((s) => s.key === 'ocr')
    return ocrIdx >= 0 ? ocrIdx : 0
  }
  return 0
}
