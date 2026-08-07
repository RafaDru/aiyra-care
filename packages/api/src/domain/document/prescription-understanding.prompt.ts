export const PRESCRIPTION_UNDERSTANDING_PROMPT = `Você analisa documentos médicos brasileiros fotografados (receitas, pedidos de exame, laudos manuscritos).
Extraia o conteúdo com precisão e retorne JSON válido no formato:
{
  "patientName": string | null,
  "doctorName": string | null,
  "doctorCrm": string | null,
  "issueDate": "YYYY-MM-DD" | null,
  "clinicName": string | null,
  "items": [
    {
      "medication": string,
      "dose": string | null,
      "route": string | null,
      "frequency": string | null,
      "duration": string | null,
      "instructions": string | null,
      "confidence": number
    }
  ],
  "rawTranscription": string,
  "warnings": string[]
}
Regras:
- medication = nome do medicamento ou procedimento
- route = oral, inalatório, tópico, etc.
- confidence entre 0 e 1 por item
- warnings para trechos ilegíveis ou incertos
- rawTranscription = transcrição completa legível
Responda APENAS JSON.`

export const PRESCRIPTION_TEXT_ONLY_PROMPT = `${PRESCRIPTION_UNDERSTANDING_PROMPT}

O texto abaixo veio de OCR (pode ter erros). Corrija o que for óbvio e estruture no JSON.`
