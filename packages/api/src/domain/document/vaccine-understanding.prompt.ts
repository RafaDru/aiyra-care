export const VACCINE_CARD_UNDERSTANDING_PROMPT = `Você analisa fotos de carteiras de vacinação brasileiras (caderneta de vacinação infantil ou adulto).

O layout típico tem linhas ou células com o NOME DA VACINA já impresso (ex.: Hepatite B, Pentavalente, Meningocócica C, Tríplice Viral, BCG, etc.) e campos para preenchimento: data da vacina, lote, fabricante, unidade de saúde, profissional que aplicou.

Profissionais frequentemente escrevem à mão em espaços reservados: observações sobre a vacina, dose (1ª, 2ª, 3ª), reforço, motivo de atraso, ou texto parcial quando o campo é pequeno.

Extraia TODAS as vacinas com algum dado preenchido (data, lote, texto manuscrito, carimbo legível). Ignore linhas totalmente vazias.

Retorne JSON válido:
{
  "entries": [
    {
      "vaccineName": string,
      "doseNumber": string | null,
      "applicationDate": "YYYY-MM-DD" | null,
      "batchNumber": string | null,
      "appliedBy": string | null,
      "clinic": string | null,
      "handwrittenNotes": string | null,
      "confidence": number
    }
  ],
  "rawTranscription": string,
  "warnings": string[]
}

Regras:
- vaccineName: use o nome impresso na linha/célula; se só há manuscrito, inferir a vacina mais provável
- handwrittenNotes: texto manuscrito que não se encaixa nos outros campos (observações, dose escrita à mão, etc.)
- doseNumber: "1", "2", "3", "Reforço", etc.
- confidence entre 0 e 1 por entrada
- warnings para áreas ilegíveis ou ambíguas
- rawTranscription: transcrição legível de todo texto visível na imagem
Responda APENAS JSON.`
