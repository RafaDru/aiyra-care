# OCR em laudos de exame → medidas

Prática adotada no AiyraCare: **todo laudo textual de exame passa por OCR** na importação (sync de portal ou upload manual), e o texto extraído alimenta o histórico de **medidas** (`measurement_observations`).

## Fluxo

```
PDF/imagem de laudo  →  Cascade OCR (local → Vision se necessário)
        ↓
documents.extractedText  (+ resultSummary resumido no exame)
        ↓
buildExamOcrCorpus (tipo + lab + resumo + OCR do doc + OCR do pedido)
        ↓
Parsers de lab (hoje: glicemia)  →  measurement_observations
```

## Onde o OCR roda

| Origem | Momento | Provider típico |
|--------|---------|-----------------|
| Upload manual (`documentType` exam/report) | `DocumentService.uploadAndCreate` | cascade por tipo |
| Hermes Pardini sync | `persistHermesPardiniLaudos` (PDF do pedido) | `cascade:report` |
| Mater Dei sync | `persistMaterDeiExamFiles` (PDF de laudo) | `cascade:report` |
| Imagens de série (TC, VueMotion) | **sem OCR** (`exempt_imaging`) | — |

## Medidas automáticas

Após sync Hermes Pardini ou Mater Dei (quando laudos são baixados/OCR), a API chama `runExamMeasurementImport`:

- **Glicemia** — `GlucoseExamImportService` lê o corpus OCR (`parseGlucoseMgDl`); `sourceRef = exam:{id}` evita duplicata.
- Import manual na UI: `POST /measurements/import-glucose` (aba Medidas).

Novos analitos: adicionar parser em `domain/measurement/` + tipo em `measurement_types` + registrar no helper de import.

## Arquivos-chave

- `exam-pdf-text.helper.ts` — OCR de PDF de laudo
- `application/exam/exam-ocr-text.ts` — corpus para parsing
- `glucose-exam-import.service.ts` — glicemia de exames
- `exam-measurement-import.helper.ts` — hook após sync

## LLM

OCR de laudos **não usa LLM** (custo e latência). Interpretação LLM (manuscrito) continua em receitas/carteiras via `DocumentInterpretationService`.
