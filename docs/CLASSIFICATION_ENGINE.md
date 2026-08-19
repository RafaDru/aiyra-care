# Motor de Classificação de Rótulos (Assistência de Operadora)

Classifica descrições de atendimento/procedimento vindas de portais de operadora
(ex.: Amil "Atendimentos Realizados") em **tipo clínico** e **destino** no modelo
canônico (`consulta → medical_records`, `exame → exams`, ...).

## Arquitetura (Hexagonal)

```
domain/classification/
  label-classification.ts   # Tipos + port LabelClassifierEngine + normalizeHealthLabel
  exam-catalog.ts           # Catálogo canônico de procedimentos (fonte de verdade versionada)

application/classification/
  amil-label-classifier.ts  # Motor rules+fuzzy (implementa o port); fallback LLM opcional

infrastructure/classification/
  fuzzy-exam-catalog-lookup.ts  # Adapter do lookup (edit-distance leve)
```

- **Port no domínio** (`LabelClassifierEngine`): `classify`, `classifyBatch`,
  `classifySync`. Permite **trocar de motor** (rules → fuzzy → embeddings/LLM)
  sem tocar em quem consome.
- **Motor em application** (`AmilLabelClassifier`): combina catálogo exato +
  sinônimos/siglas + palavras-chave por categoria + fuzzy no catálogo. Lua
  versão pura (sem I/O) para uso síncrono e em lote.
- **Adapter em infrastructure** (`FuzzyExamCatalogLookup`): implementa o lookup
  com distância de edição (`@nlptools/distance`, leve). Pode ser substituído por
  um matcher semântico/embedding sem impacto no domínio.
- **Fallback LLM plugável**: `AmilLabelClassifier` aceita `llmFallback` no
  construtor e expõe `classifyWithLlm` para rótulos ambíguos (confiança baixa).
  A integração real com `llm-router` fica como hook opcional.

## Onde é usado

1. **Tempo de integração** — `amil-canonical.mapper.ts` injeta o motor
   (`ctx.classifier`, default = `AmilLabelClassifier` + `FuzzyExamCatalogLookup`)
   e roteia cada `usageItem`: `exam → record type 'exam'` (importado em `exams`),
   senão `medical_record` (importado em `medical_records`).
   O importer (`canonical-batch-importer.service.ts`) ganhou o ramo `importAmilExam`.
2. **Jobs de otimização** — `scripts/reclassify-amil-medical-records.ts` reutiliza
   o **mesmo motor** para revisar `medical_records` de origem Amil e criar os
   `exams` correspondentes (dry-run por padrão; `--apply` cria).

## Evoluindo o catálogo

- Novo procedimento: basta adicionar um `CatalogEntry` em `exam-catalog.ts`
  (id, name, aliases, fuzzables). Sem alterar o motor.
- Nova categoria/rótulo: ajustar keywords em `exam-catalog.ts` ou fornecer
  `kindHints` ao construtor do motor.
- Novo motor: implementar `LabelClassifierEngine` (port) e injetar onde se deseja.

## Testes

```
npx vitest run tests/amil-label-classifier.test.ts
```
