/** Normaliza respostas da API result-exam do Meu Mater Dei. */

export interface MaterDeiExamItem {
  examOrderId: string | number
  examOrderItemId?: string | number
  examType: string
  examDate: string
  status?: string
  doctorName?: string
  provider?: string
  hospitalId?: string | number
  attendanceId?: string | number
  attendanceType?: string
  orderType?: string
  accessionNumber?: string
  patientName?: string
  imageAvailable?: boolean
  reportAvailable?: boolean
  itemType?: string
  raw: Record<string, unknown>
}

export interface MaterDeiDocumentItem {
  documentType: string
  title?: string
  id?: string | number
  createdAt?: string
  raw: Record<string, unknown>
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function pickStr(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k]
    if (v != null && String(v).trim()) return String(v).trim()
  }
  return undefined
}

function pickId(obj: Record<string, unknown>, ...keys: string[]): string | number | undefined {
  for (const k of keys) {
    const v = obj[k]
    if (v != null && v !== '') return typeof v === 'number' ? v : String(v)
  }
  return undefined
}

/** Converte um registro de `/patients/exams/search` em linhas de exame (1 por item do pedido). */
export function mapMaterDeiExamSearchRow(row: unknown): MaterDeiExamItem[] {
  const rec = asRecord(row)
  const order = asRecord(rec.order)
  const orderId = pickId(order, 'id', 'orderId', 'examOrderId')
  if (orderId == null) return []

  const base = {
    examOrderId: orderId,
    examDate: pickStr(rec, 'requestedDate', 'requestDate', 'date', 'examDate') ?? '',
    status: pickStr(rec, 'status', 'examStatus'),
    doctorName: pickStr(rec, 'doctorName', 'physicianName'),
    provider: pickStr(rec, 'provider', 'laboratory', 'labName'),
    hospitalId: pickId(rec, 'hospitalId'),
    attendanceId: pickId(rec, 'attendanceId'),
    attendanceType: pickStr(rec, 'attendanceType', 'type'),
    orderType: pickStr(order, 'type', 'orderType'),
    patientName: pickStr(asRecord(rec.patient), 'name'),
    raw: rec,
  }

  const items = Array.isArray(order.items) ? order.items : []
  if (items.length === 0) {
    const fallbackName = pickStr(order, 'name', 'description')
      ?? pickStr(rec, 'description', 'procedureName')
      ?? 'Exame Mater Dei'
    return [{
      ...base,
      examType: fallbackName,
      raw: rec,
    }]
  }

  return items.map((item) => {
    const it = asRecord(item)
    const name = pickStr(it, 'name', 'description', 'examName', 'procedureName') ?? 'Exame Mater Dei'
    return {
      ...base,
      examOrderItemId: pickId(it, 'id', 'item_id', 'itemId', 'exam_id', 'examId'),
      examType: name,
      accessionNumber: pickStr(it, 'accession_number', 'accessionNumber', 'accession'),
      imageAvailable: it.imageAvailable === true,
      reportAvailable: it.reportAvailable === true,
      itemType: pickStr(it, 'type'),
      raw: { ...rec, _item: it },
    }
  })
}

export function mapMaterDeiExamSearchResponse(data: unknown): MaterDeiExamItem[] {
  const list = Array.isArray(data)
    ? data
    : Array.isArray(asRecord(data).items)
      ? asRecord(data).items as unknown[]
      : Array.isArray(asRecord(data).content)
        ? asRecord(data).content as unknown[]
        : []

  return list.flatMap(mapMaterDeiExamSearchRow)
}

export function mapMaterDeiDocumentsResponse(data: unknown, documentType: string): MaterDeiDocumentItem[] {
  const list = Array.isArray(data)
    ? data
    : Array.isArray(asRecord(data).documents)
      ? asRecord(data).documents as unknown[]
      : Array.isArray(asRecord(data).items)
        ? asRecord(data).items as unknown[]
        : data != null ? [data] : []

  return list.map((row) => {
    const rec = asRecord(row)
    return {
      documentType,
      title: pickStr(rec, 'title', 'name', 'fileName', 'originalFilename'),
      id: pickId(rec, 'id', 'documentId'),
      createdAt: pickStr(rec, 'createdAt', 'uploadedAt', 'date'),
      raw: rec,
    }
  })
}

export function materDeiExamDedupKey(exam: Pick<MaterDeiExamItem, 'examOrderId' | 'examOrderItemId' | 'examType' | 'examDate'>): string {
  const itemPart = exam.examOrderItemId != null ? String(exam.examOrderItemId) : exam.examType
  const datePart = exam.examDate.slice(0, 10)
  return `mater_dei:${exam.examOrderId}:${itemPart}:${datePart}`
}
