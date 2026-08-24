# Pipeline de artefatos de exame → modelo canônico

> **Última atualização:** 2026-08-24  
> Relacionado: `docs/EXAM_OCR.md`, `docs/DATA_HYGIENE.md`, `docs/ARCHITECTURE_DATA_LAYERS.md`, `docs/CLASSIFICATION_ENGINE.md`

## Objetivo

Converter **laudos e anexos de exame** (PDF, imagem, office) em dados **normalizados** no modelo canônico:

| Destino | Conteúdo |
|---------|----------|
| `exams` | Metadados + resumo textual |
| `documents` + `extracted_text` | Texto nativo/OCR |
| `exam_orders` | Pedido consolidado quando aplicável |
| `exam_result_items` | **Marcadores estruturados** (analito, valor, unidade, ref, status, data) |
| `measurement_observations` | Valores pontuais legados (ex.: glicemia via corpus OCR) |

## Sequência motora unificada (2026-08-21+)

Todos os fornecedores (Hermes Pardini, Mater Dei, upload manual) passam pelo mesmo pipeline em `exam-artifact.pipeline.ts`:

```text
Artefato (GCS / portal / upload)
    ↓
[1] Extração de texto
    → PyMuPDF nativo (python-pdf-extractor.py)
    → fallback OCR imagem se PDF sem texto
    ↓
[2] Parser determinístico por fonte (se canHandle)
    → HermesPardiniPdfReportParser (+ resultados anteriores)
    → MaterDeiPdfReportParser v2 (seções; hemograma; triagem neonatal)
    ↓
[3] LLM fallback interno (se 0 marcadores e budget OK)
    → llm-marker-fallback.extractor.ts
    → metering cost_bucket=internal, feature=exam_marker_extraction
    → aprendizado em semantic_catalog_cache (domain: lab_analyte)
    ↓
[4] Persistência idempotente em exam_result_items
    → ON CONFLICT (patient, marker, collected_at, display_value)
    → source_document_id = lastro ao documento de origem
```

Código principal:

| Componente | Caminho |
|------------|---------|
| Pipeline orquestrador | `infrastructure/exam-artifact/exam-artifact.pipeline.ts` |
| LLM fallback | `application/exam-artifact/llm-marker-fallback.extractor.ts` |
| Prompt/parser LLM | `domain/llm/llm-marker-extraction-prompt.ts` |
| Mater Dei parser | `infrastructure/ocr/materdei-pdf.parser.ts` |
| Hermes parser | `infrastructure/ocr/hermes-pardini-pdf.parser.ts` |
| Repositório marcadores | `infrastructure/persistence/exam-result-item.pg.repository.ts` |

## Lastro documental (`source_document_id`)

Migration **046** adiciona `source_document_id` em `exam_result_items` (FK → `documents.id`).

- Parsers e re-extração gravam o vínculo ao PDF/laudo de origem.
- Backfill retroativo: `database/relational/backfill-exam-result-item-source-doc.sql` — extrai `documentId` de `exams.notes` (JSON Hermes/Mater Dei).
- Método reutilizável: `ExamResultItemPgRepository.backfillSourceDocuments()`.

**Status atual (família):** 58 marcadores, 100% com lastro após backfill.

## Dependência da higienização

1. Sync/import pode duplicar o mesmo laudo (portal + upload).
2. `hygiene_candidates` sugere pares; usuário confirma `same_entity`.
3. Duplicata recebe `hygieneCanonicalId` em meta; motor ignora não-canônicos.

Ver `docs/DATA_HYGIENE.md`.

## UI — Marcadores do Exame

- Aba **Exames** → sub-aba **Marcadores do Exame** (`ExamMarkersDashboard`).
- Master-detail: lista compacta + gráfico de evolução na mesma tela.
- Faixas de referência no gráfico (`refLow`/`refHigh` parseados de texto).
- API: `GET /patients/:id/exam-markers/trends`, `GET /exam-result-items`.

## Contexto Ava

`AvaPatientContextService` inclui seção **"Marcadores laboratoriais estruturados"** com valor, unidade, referência, status e histórico (últimas 4 medições por analito). Sem isso a Ava só via `exams.result_summary` textual.

## API e scripts

```powershell
cd packages/api

# Higienização
npm run scan:hygiene
npx tsx scripts/run-hygiene-scan.ts <patientId>

# Migration 046
node scripts/apply-migration-046.mjs

# Re-extração Mater Dei (Bruno) — reset + pipeline v2
npx tsx scripts/reextract-bruno-markers.ts

# Diagnóstico parser Mater Dei
npx tsx scripts/diagnose-materdei-parser.ts

# Tabela de normalização por documento
npx tsx scripts/report-bruno-normalization-table.ts
```

## Roadmap técnico (próximos incrementos)

1. ~~**Structured exam results**~~ — `exam_result_items` (045) + idempotência (046) ✅
2. **Backfill OCR** — reprocessar laudos sem `extracted_text`.
3. **Parsers adicionais** — perfil lipídico, função renal (outros labs).
4. **Office formats** — PPT/DOC dedicado.
5. **Job agendado** — `normalize-all` após `scan:hygiene`.
6. **Ava aceleradores** — "Pergunte à Ava" com pin implícito do exame/marcador.

Épico: `exam-artifact-normalization` + `exam-markers-dashboards` em `docs/roadmap.json`.

## LGPD / clínica

- Parsers determinísticos rodam **sem LLM** (latência, PHI).
- LLM fallback de marcadores = **custo operacional interno** (não franquia do cliente).
- LLM de manuscrito/receita = **custo cliente** (`DocumentInterpretationService`).
- Export e timeline usam entidade **canônica** após higienização.
