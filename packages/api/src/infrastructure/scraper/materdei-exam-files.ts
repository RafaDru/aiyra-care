import type { APIRequestContext } from 'playwright'
import type { MaterDeiExamItem } from './materdei-exam.mapper.js'
import { MATER_DEI_PROXY } from './materdei-sync.scraper.js'

const PARTIAL_PATH = `${MATER_DEI_PROXY.examResults}/result-exam/api/v1/patients/exams/partially-available/download`

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, Accept: 'application/pdf,application/octet-stream,*/*' }
}

function orderTypesForExam(exam: MaterDeiExamItem): string[] {
  const fromExam = [exam.orderType, exam.itemType].filter(Boolean) as string[]
  const inferred: string[] = []
  if (exam.imageAvailable) inferred.push('IMAGE')
  if (exam.reportAvailable) inferred.push('LABORATORY')
  return [...new Set([...fromExam, ...inferred, 'IMAGE', 'LABORATORY'])]
}

/** Baixa laudo/PDF via endpoint partially-available (validado no portal Mater Dei). */
export async function downloadMaterDeiExamFile(
  request: APIRequestContext,
  token: string,
  gatewayPatientId: number,
  exam: MaterDeiExamItem,
): Promise<{ buffer: Buffer; mimeType: string; filename: string } | null> {
  if (!exam.reportAvailable && !exam.imageAvailable) return null
  if (!gatewayPatientId || gatewayPatientId <= 0) return null

  for (const orderType of orderTypesForExam(exam)) {
    const res = await request.get(PARTIAL_PATH, {
      headers: authHeaders(token),
      params: {
        patientId: String(gatewayPatientId),
        examOrderId: String(exam.examOrderId),
        orderType,
      },
    })
    if (!res.ok()) continue
    const buffer = Buffer.from(await res.body())
    if (buffer.length < 128) continue
    const ct = res.headers()['content-type'] ?? 'application/pdf'
    if (ct.includes('json')) continue
    const ext = ct.includes('pdf') ? 'pdf' : 'bin'
    const slug = exam.examType.replace(/[^\w.-]+/g, '_').slice(0, 40)
    return {
      buffer,
      mimeType: ct.split(';')[0]?.trim() || 'application/pdf',
      filename: `materdei-${slug}-${exam.examOrderId}.${ext}`,
    }
  }
  return null
}
