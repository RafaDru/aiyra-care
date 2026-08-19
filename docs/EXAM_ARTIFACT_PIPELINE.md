# Pipeline de artefatos de exame → modelo canônico

> **Última atualização:** 2026-08-19  
> Relacionado: `docs/EXAM_OCR.md`, `docs/DATA_HYGIENE.md`, `docs/ARCHITECTURE_DATA_LAYERS.md`

## Objetivo

Converter **todos os laudos e anexos de exame** (PDF, PPT, DOC, imagens) em dados **normalizados e transpostos** no modelo canônico do AiyraCare:

- Entidade `exams` (metadados + resumo)
- `documents` + `extracted_text` (texto OCR)
- `exam_orders` (pedido consolidado quando aplicável)
- `measurement_observations` (valores pontuais: glicemia, etc.)
- Futuro: campos estruturados por analito, referências, flags

## Dependência da higienização

Antes de extrair medidas ou enriquecer timeline, o motor precisa de **identidade canônica** do exame:

1. Sync/import pode criar o mesmo laudo em Hermes + Mater Dei + upload manual.
2. Detector de higienização (`hygiene_candidates`) sugere pares.
3. Usuário confirma `same_entity` → duplicata recebe `hygieneCanonicalId` em `exams.notes` meta.
4. **Motor de normalização ignora duplicatas** e processa só o registro canônico (`isExamHygieneDuplicate`).

Sem isso, medidas e OCR se multiplicam e o contexto Ava infla.

## Estágios do pipeline

```text
Artefato (GCS / portal)
    ↓
[1] Persistência + dedup na importação (skippedExams, dedup key em notes)
    ↓
[2] OCR / extração de texto (Cascade local → Vision)
    → documents.extracted_text, exams.result_summary
    ↓
[3] Higienização (on-insert + scan batch)
    → hygiene_candidates; resolve same_entity → hygieneCanonicalId
    ↓
[4] Corpus OCR (tipo + lab + resumo + doc + pedido)
    → buildExamOcrCorpus
    ↓
[5] Parsers por analito / layout de lab
    → measurement_observations (sourceRef exam:{id})
    ↓
[6] Futuro: LLM estruturado + validação + Neo4j associações
```

## Formatos suportados hoje

| Formato | OCR | Notas |
|---------|-----|-------|
| PDF laudo | ✅ Cascade `report` | Hermes, Mater Dei, upload manual |
| Imagem laudo | ✅ | Upload `exam` / `report` |
| PPT / DOC | ⚠️ parcial | Via cascade document OCR quando upload manual |
| TC / série imagem | ❌ exempt | Sem texto; só artefato |

## Onde roda hoje

| Etapa | Código |
|-------|--------|
| OCR PDF sync | `exam-pdf-text.helper.ts`, scrapers Hermes/Mater Dei |
| Corpus | `application/exam/exam-ocr-text.ts` |
| Medidas (glicemia) | `glucose-exam-import.service.ts` |
| Hook após sync | `exam-measurement-import.helper.ts`, `integration-link-sync.service.ts` |
| Motor orquestrador | `exam-artifact-normalization.service.ts` |
| Higienização | `hygiene-detector.service.ts`, `exam-canonical.ts` |

## API e scripts

```powershell
# Varredura de duplicatas (todos pacientes ou um)
cd packages/api
npm run scan:hygiene
npx tsx scripts/run-hygiene-scan.ts <patientId>

# Normalização artefato → medidas (após higienização)
npx tsx scripts/run-exam-artifact-normalize.ts <patientId>

# API higienização
GET  /hygiene/candidates?patientId=
POST /hygiene/candidates/:id/resolve  { "decision": "same_entity" | "distinct" | "dismissed" }
```

## Roadmap técnico (próximos incrementos)

1. **Backfill OCR** — job que reprocessa `result_file_url` sem `extracted_text`.
2. **Parsers** — hemograma, perfil lipídico, função renal (regex + tabelas por lab).
3. **Office formats** — pipeline dedicado PPT/DOC (LibreOffice headless ou Cloud Convert).
4. **Merge físico** — após `same_entity`, consolidar `documentId` / laudo no canônico.
5. **Structured exam results** — tabela `exam_result_items` (analito, valor, ref, unidade).
6. **Job agendado** — `normalize-all` após `scan:hygiene` semanal.

Épico: `exam-artifact-normalization` em `docs/roadmap.json`.

## LGPD / clínica

- OCR e parsers rodam **sem LLM** nos laudos (custo, latência, PHI).
- LLM só em interpretação de manuscrito/receita (`DocumentInterpretationService`), com consentimento quando aplicável.
- Export e timeline usam entidade **canônica** após higienização.
