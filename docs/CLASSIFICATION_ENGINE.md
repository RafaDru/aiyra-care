# Motor de Classificação de Rótulos (Assistência de Operadora)

Classifica descrições de atendimento/procedimento vindas de portais de operadora
(ex.: Amil "Atendimentos Realizados") em **tipo clínico** e **destino** no modelo
canônico (`consulta → medical_records`, `exame → exams`, ...).

## Arquitetura (Hexagonal)

```
domain/semantic-classification/
  semantic-classification.types.ts  # Contrato genérico reusável (SemanticDomain, SemanticClassificationResult, CachePort)
  vector-embedding.engine.ts        # Motor de Embeddings Vetoriais (Cosseno + N-Gram) com Score de Confiança [0..1]

domain/classification/
  label-classification.ts           # Tipos de rótulo + port LabelClassifierEngine + normalizeHealthLabel
  exam-catalog.ts                   # Catálogo canônico de procedimentos (fonte de verdade versionada)

application/semantic-classification/
  unified-semantic-classifier.service.ts # Motor Genérico em 3 Tiers (Vetor -> LLM -> Auto-Categorização no Catálogo Dinâmico)

application/classification/
  amil-label-classifier.ts          # Motor rules+fuzzy (implementa o port); fallback LLM opcional

infrastructure/classification/
  vector-exam-catalog-lookup.ts     # Adapter do lookup via Embeddings Vetoriais (Cosseno)
  fuzzy-exam-catalog-lookup.ts      # Adapter de edição (Jaro-Winkler)

infrastructure/persistence/
  semantic-catalog-cache.pg.repository.ts # Repositório da tabela `semantic_catalog_cache` (Migration 044)
```

- **Motor Semântico Genérico em 3 Tiers (`UnifiedSemanticClassifierService`)**:
  1. **Tier 1 (Embeddings Vetoriais & Catálogo Dinâmico)**:
     - Normalização + vetorização N-Gram/Cosseno + busca no catálogo estático e dinâmico.
     - Se similaridade $\ge$ `acceptableVectorThreshold` (ex.: 0.80), retorna com `method: 'vector'` e grau de confiança quantitativo.
  2. **Tier 2 (Fallback LLM para Ambíguos)**:
     - Se o vetor não atinge o limite aceitável de confiança, aciona o LLM (com metering e orçamento interno).
  3. **Tier 3 (Auto-Categorização no Catálogo Dinâmico)**:
     - Após a classificação do LLM, salva automaticamente o aprendizado na tabela `semantic_catalog_cache` (Migration 044).
     - Buscas futuras desse termo ou de variações similares batem direto no vetor/cache em 1ms sem custo de LLM.
- **Reusabilidade Multidomínio**:
  - Desenhado para ser reutilizado além das operadoras de saúde: OCR de documentos (`ocr_document`), analitos de laudo (`lab_analyte`), receitas (`medication`), etc.

- **Port no domínio** (`LabelClassifierEngine`): `classify`, `classifyBatch`,
  `classifySync`. Permite **trocar de motor** (rules → fuzzy → embeddings/LLM)
  sem tocar em quem consome.
- **Motor em application** (`AmilLabelClassifier`): combina catálogo exato +
  sinônimos/siglas + palavras-chave por categoria + fuzzy no catálogo. Lua
  versão pura (sem I/O) para uso síncrono e em lote.
- **Adapter em infrastructure** (`FuzzyExamCatalogLookup`): implementa o lookup
  com distância de edição (`@nlptools/distance`, leve). Pode ser substituído por
  um matcher semântico/embedding sem impacto no domínio.
- **Fallback LLM plugável e integrado**: `AmilLabelClassifier` aceita `llmFallback`.
  O `LlmBackedLabelClassifier` (application) une o motor local ao `LlmRouter`
  (cascata Zen free → Go DeepSeek → Gemini) para rótulos ambíguos (confiança < 0.6),
  com **metering de custo interno** (`LlmInternalCostService`, `cost_bucket=internal`
  + orçamento R$100/mês). Ver `docs/LLM_USAGE.md#custo-cliente-vs-interno-migration-043`.
  Fábrica: `buildClassificationClassifier(pool, opts)` (application/llm/llm-internal-cost.factory.ts).

## Onde é usado

1. **Tempo de integração** — `amil-canonical.mapper.ts` injeta o motor
   (`ctx.classifier`, default = `AmilLabelClassifier` + `FuzzyExamCatalogLookup`)
   e roteia cada `usageItem`: `exam → record type 'exam'` (importado em `exams`),
   senão `medical_record` (importado em `medical_records`).
   O importer (`canonical-batch-importer.service.ts`) ganhou o ramo `importAmilExam`.
2. **Jobs de otimização** — `scripts/reclassify-medical-records.ts` reutiliza o
   **mesmo motor** para revisar `medical_records` de **qualquer fonte** (default todas;
   `--source=unimed|amil|...`) e criar os `exams` correspondentes (dry-run por padrão;
   `--apply` cria; `--llm` aciona o fallback LLM). `reclassify-amil-medical-records.ts`
   é a variante focada em Amil. Comandos: `npm run reclassify:all`, `reclassify:apply`,
   `reclassify:amil`.

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
