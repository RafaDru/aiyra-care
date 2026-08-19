# Agentes de apoio familiar — visão e arquitetura

> **Status:** Fase 0 — fundação (2026-08-14)  
> **Épico roadmap:** `agentes`  
> **Regulatório:** ver `docs/legal/ANVISA_SAMD_POSITION.md` — **apoio à comunicação**, não diagnóstico

## O que é (e o que não é)

O AiyraCare oferece **agentes de apoio** para pais, mães e responsáveis — no espírito de uma **doula** no parto: presença, organização e linguagem clara, **sem substituir** o pediatra.

| Sim | Não |
|-----|-----|
| Ajudar a decidir **quando conversar** ou **buscar** atendimento | Dar diagnóstico |
| Lembrar o que **informar o médico** | Prescrever ou ajustar dose |
| Alertar sobre **leituras preocupantes** (com “pode ser erro de equipamento”) | Triagem de urgência autônoma sem disclaimer |
| Sugerir **temas para conversa** (“considere discutir hipótese Z”) | Afirmar “é Z” |
| Preparar **resumo para consulta** com citações ao prontuário | Inventar dados não presentes no PG |

## Nome do produto (em aberto)

**Decisão (2026-08-14):** **Ava** — Agente Virtual Aiyra. Uma persona no chat; capacidades clínicas como **skills** internas (não agentes separados na UI).

Código interno: `ava` / `family-support`; bounded context `application/ava/`.

| Nome | Prós |
|------|------|
| **Ava (Agente Virtual Aiyra)** | Marca + abreviação humana; espaço de chat natural |
| ~~Apoio Aiyra~~ | Substituído por Ava na UI; APIs podem manter `family-support` |

## Skill vs Agente — alinhamento

Há **dois** significados de “skill” — não misturar:

| | Cursor Skills (`.cursor/skills/`) | Skills de produto (Ava) | Agente (Ava) |
|--|--|--|--|
| **Quem usa** | Desenvolvedores / CI | Runtime da Ava | Família no app |
| **O que é** | Checklist legal/médico no merge | Módulo invocável (farmacêutico, vitals) | Persona + chat + orquestração |
| **Exemplo** | `aiyracare-review-medical` | `checkMedicationInteractions` | “Oi, sou Ava…” |

**Recomendação:** **um agente (Ava)** + **várias skills** — não vários chats (“pediatra”, “farmacêutico”) competindo na UI.

```
Usuário ↔ Ava (chat)
              ↓
        AvaOrchestrator
              ↓
    ┌─────────┼─────────┐
    │         │         │
 context   skill:      skill:
 bundle    farmácia    monitoramento
 (PG)      skill:      skill:
           consult-prep symptom-intake
```

- **Agente** = identidade, disclaimer, memória da conversa, política de segurança, confirmação humana antes de mutar dados.
- **Skill** = função pura ou semi-pura: entrada estruturada → insights / proposta de ação / texto com citações. Sem personalidade própria.

Skills candidatas (ordem):

| Skill | Função | LLM? |
|-------|--------|------|
| `monitoring-safety` | Vitals críticos, SpO₂, febre | Regras + redação |
| `medication-safety` | Alergia, AINE duplo, interações | Regras + base drogas |
| `symptom-intake` | Perguntas guiadas (“o que está ocorrendo?”) | LLM guiado |
| `consult-prep` | Resumo pré-consulta | Contexto PG + LLM |
| `symptom-evolution` | Temas para conversar com médico | LLM + gate médico |

## Ava — espaço de chat

### Objetivo UX

Muitos responsáveis **não sabem nomear** o problema. O chat permite:

- Narrativa livre (“ele está estranho, não quer comer…”)
- Ava **reformula** em linguagem clara e **extrai** estrutura (sintoma, início, medicação, medidas)
- Oferece registrar no prontuário **com confirmação explícita**

### Onde na app

- Rota dedicada: `/patients/:id/ava` ou aba **Ava** no perfil
- Contexto opcional: `health_thread_id` (enfermidade em curso)
- Reuso: `health_thread_entries` para notas/sintomas já capturados pelo Acompanhamento

### Modelo de dados (proposta)

```text
ava_conversations     # patient_id, account_id, health_thread_id?, title?
ava_messages          # role user|assistant|system, body, citations_json, proposed_actions_json
ava_action_proposals  # status pending|confirmed|rejected, tool_name, payload, executed_at
```

Mensagens do assistente **sempre** podem incluir `citations[]` apontando ao PG.

### Orquestração (turno de chat)

1. **Bundle determinístico** — `PatientContext` + últimas medidas + meds + alergias + thread ativa (sem inventar).
2. **Skills síncronas** — rodar regras (family-support) antes do LLM; injetar no prompt como “fatos”.
3. **LLM** — persona Ava; temperatura baixa; **proibido** afirmar diagnóstico; só “temas para conversa”.
4. **Tool proposals** — se precisa gravar medida/nota/med, retorna `proposed_action` (não executa).
5. **UI de confirmação** — card “Registrar temperatura 38,2 °C?” → usuário confirma → API Core.
6. **Auditoria** — log `ava_action_proposals` + `account_id`.

### APIs com autorização humana

Padrão **propor → confirmar → executar** (nunca mutação silenciosa):

| Tool | Confirmação |
|------|-------------|
| `create_measurement` | Preview valor + hora |
| `create_thread_entry` | Preview texto |
| `create_medication_administration` | Preview + skill farmácia |
| `soft_delete_entity` | Preview + motivo |

Implementação: tools chamam os mesmos services HTTP já existentes (`measurements`, `health-threads/entries`, …), não SQL direto do LLM.

### Soft delete (requisito)

Hoje o Core usa **DELETE físico** em várias entidades. Para Ava (e LGPD), evoluir para:

- Colunas `deleted_at`, `deleted_by`, opcional `deletion_source` (`ava`, `user`, `admin`)
- Queries padrão `WHERE deleted_at IS NULL`
- Ava só propõe “remover da vista” → soft delete; hard delete só fluxo LGPD existente

Migration transversal (039+) — priorizar entidades que Ava pode tocar: `measurement_observations`, `medication_administrations`, `health_thread_entries`.

## RAG e organização do conhecimento do paciente

### Princípio: híbrido, não “só embedding”

Para pediatria familiar, **RAG puro** (embed tudo → top-k) falha em:

- Alergias e meds ativos (sempre obrigatórios — não podem “não ser retrieved”)
- Medidas recentes intradiárias (recência > similaridade textual)
- Correlação entre eventos (consulta → exame → med)

**Modelo em camadas:**

```
Turno Ava
   │
   ├─ Camada 0 — Fatos mandatórios (sempre no prompt, sem RAG)
   │     identidade, alergias, meds ativos, alertas PatientContext
   │
   ├─ Camada 1 — Foco temático (scope)
   │     health_thread ativa OU “episódio” escolhido pelo usuário
   │
   ├─ Camada 2 — Recência estruturada
   │     timeline 7–30d, monitoring-export, últimas N observações
   │
   ├─ Camada 3 — RAG vetorial (pgvector)
   │     chunks indexados: OCR, laudos, notas longas, histórico > 30d
   │
   └─ Camada 4 — Grafo (opcional, Neo4j)
         caminhos clínicos quando NEO4J_SYNC_ENABLED
```

`PatientContextService.build()` já é a **Camada 0** determinística — Ava não reinventa isso.

### Sessões vs temas vs chat único

| Conceito | O que é | UX |
|----------|---------|-----|
| **Sessão Ava** | `ava_conversations` — linha do tempo de chat com a família | Lista “Conversas com Ava” (opcional); default = conversa contínua |
| **Tema / foco** | `health_threads` + links clínicos | Chip “Foco: virose de agosto” — **não** obriga outro chat |
| **Chat único** | Uma conversa principal por paciente | Família não precisa escolher “modo” |

**Recomendação:** **um chat principal** + **foco temático opcional** (`focus_thread_id` na mensagem).

- Mensagem sem foco → retrieval amplo (Camada 2 + 3).
- Mensagem com foco → prioriza entradas do thread, medidas/medicações com `health_thread_id`, links do grafo clínico.
- Confirmar nota/sintoma → `health_thread_entries` (já indexado para RAG).

Evitar duplicar: chat Ava ≠ substituto do Acompanhamento — o chat **alimenta** o thread com confirmação.

### Índice de conhecimento (`patient_knowledge_chunks`)

Proposta de tabela (migration futura):

| Coluna | Função |
|--------|--------|
| `patient_id` | escopo |
| `entity_type` + `entity_id` | citação canônica |
| `health_thread_id` | nullable — agrupa por episódio |
| `occurred_at` | recência no ranking |
| `facet` | `clinical`, `monitoring`, `admin`, `conversation` |
| `text` | texto para embedding + snippet UI |
| `embedding` | vector (pgvector) |
| `deleted_at` | soft delete — chunk some do RAG |

**Chunking por tipo:**

| Fonte | 1 chunk = |
|-------|-----------|
| `measurement_observation` | 1 observação (tipo + valor + hora) |
| `medication_administration` | 1 dose registrada |
| `health_thread_entry` | 1 nota/sintoma |
| `exam` | tipo + laboratório + `resultSummary` |
| `medical_record` | 1 atendimento (resumo) |
| `document` | OCR em blocos ~500 tokens, `source_ref=document:{id}#chunk` |
| `ava_message` | opcional — só user messages confirmados como “fato” |

**Projeção:** worker após sync/import/create (espelho do `neo4j-lineage-worker`) — PG fonte da verdade, índice derivado.

### Pipeline de retrieval (cada turno)

1. **Query pack** — mensagem do usuário + `focus_thread_id` + últimas 3 mensagens Ava.
2. **Mandatory pack** — allergies + meds + identity (JSON compacto).
3. **Scoped SQL** — se foco: entries, measurements, administrations do thread.
4. **Recency SQL** — timeline PatientContext window (ex. 14d).
5. **Vector search** — `embedding <=> query` com filtro `patient_id`, boost `occurred_at`, penalizar `deleted_at`.
6. **Merge + dedupe** por `entity_id`, ordenar por relevância + recência.
7. **Token budget** — truncar Camada 3 primeiro; nunca truncar Camada 0.
8. **Skills + LLM** — skills de regras + prompt com `citations[]` explícitas.

### O que indexar com embedding vs só SQL

| Dado | Método |
|------|--------|
| Alergias, meds ativos | Sempre SQL (mandatory) |
| Vitals últimas 48h | SQL por `observed_at` |
| Thread focado | SQL por `health_thread_id` |
| Laudos OCR longos | Embedding |
| Histórico > 1 ano | Embedding + data no metadata |
| “O que o médico disse em março?” | Embedding + filtro temporal |

### Neo4j (Camada 4)

Quando habilitado: após vector+SQL, opcional `ClinicalGraphQueryService` para 1-hop / path entre entidades do pack — útil para “exame ligado à consulta X”. Não substitui RAG textual.

### Grafo inferido — pontes virtuais (visão Ava + Neo4j)

O grafo **canônico** projeta o que PG e a família **explicitamente** ligaram (`SUPPORTS`, `LINKS`, `Hypothesis`, …).

Padrões como “sintoma similar há 3 anos, ciclo sazonal” exigem arestas **inferidas pela IA**, com confiança e auditoria:

| Camada | Origem | Exemplo |
|--------|--------|---------|
| Canônica | PG / usuário / sync | `HealthThread`-[:LINKS]->`Exam` |
| Inferida | Ava / job de padrão | `SymptomEvent`-[:PATTERN_SIMILAR {confidence, span_years}]->`SymptomEvent` |
| Inferida | Ava (gate clínico) | `Hypothesis`-[:MAY_EXPLAIN {audience: clinical}]->`Condition` |

**Princípios:**

1. Inferência **não** substitui fato clínico registrado.
2. **PG audita** — `clinical_inference_edges` (proposta) → projeção Neo4j para travessia.
3. `status`: `proposed` | `accepted` | `ruled_out`; LLM **não** executa Cypher livre em produção.
4. **Thresholds por audience** — família: “tema para conversa”; clínico: hipótese com score e evidências.
5. Jobs periódicos detectam recorrência temporal; chat **consome** inferências já materializadas.

Neo4j permanece **invisível** na UI; a “magia” é retrieval + narrativa citada, não grafo exposto à família.

### Mensagens de sistema para a LLM

Entregar contexto como **blocos citáveis**, não prose solta:

```json
{
  "mandatory": { "allergies": [...], "medications": [...] },
  "focus_thread": { "id": "...", "title": "...", "entries": [...] },
  "retrieved_chunks": [
    { "citation": "measurement:uuid", "text": "SpO₂ 88% em …", "occurred_at": "…" }
  ]
}
```

Ava só pode citar IDs presentes no pack (reduz alucinação).

## Política de linguagem — mandatório (produto + LLM)

Decisão de produto (2026-08-14), **não negociável** em prompts, skills nem grafo inferido:

### Nunca

- **Afirmar diagnóstico** (“é pneumonia”, “é alergia alimentar X”).
- **Prescrever** ou ajustar dose.
- **Substituir** emergência humana com triagem autônoma disfarçada de conversa.

### Sempre permitido

| Tipo | Linguagem | Exemplo |
|------|-----------|---------|
| **Tema para debate médico** | “Vale conversar com o pediatra sobre…” | Padrão cíclico de sintomas |
| **Risco com seriedade** | Vitals críticos, contraindicação clara | SpO₂ muito baixa após repetir medida |
| **Hard stop (contraindicação)** | **NÃO aplique agora** + canais | Alergia registrada × medicação cogitada/receitada |

### Hard stops — regras antes da LLM

Situações com **prioridade `critical`** e ação `do_not_apply` (determinísticas, não dependem do modelo):

| Condição | Resposta Ava / UI |
|----------|-------------------|
| Alergia declarada × medicamento (nome/receita) | **NÃO administre agora.** Contate pediatra, urgência do plano ou SAMU (192) / PS se emergência. |
| (expandir) contraindicações documentadas | Mesmo padrão — catálogo clínico de emergência em evolução |

A LLM **não pode suavizar** um hard stop: se a regra disparou, o texto canônico da skill entra no pack e a UI usa destaque máximo (`critical`).

### Escala de gravidade (ações)

| `action` | Tom | Uso |
|----------|-----|-----|
| `discuss_with_doctor` | Calmo, organizador | Temas para consulta |
| `seek_medical_care` | Sério | Avaliação presencial recomendada |
| `do_not_apply` | **Firme, imperativo** | Contraindicação (alergia × med) |
| `verify_reading` | Cauteloso | Repetir medida / equipamento |

### Base de conhecimento emergência (evolução)

Catálogo progressivo em PG (não LLM inventando):

- Números: SAMU 192, CVV 188, canais do convênio (Unimed, Amil, …)
- Red flags pediátricas consensuais (fonte revisada por médico)
- Integração futura: `insurance_plans` / carteira → telefone urgência do operador

Skill `emergency-routing` lê esse catálogo e injeta no hard stop.

### Futuro — notificação ativa e dispositivos (horizonte)

Documentado no roadmap; **não** no MVP; exige gate regulatório + opt-in explícito:

- Monitoramento contínuo (wearables, oxímetro BLE, termômetro).
- Alertas **proativos** quando hard stop ou vital crítico persiste — com ou sem chat aberto.
- Possível escalonamento solicitado pelo usuário ou por política configurável (ex.: SpO₂ crítico N leituras).
- **Nunca** substituir SAMU/PS; sempre canal humano + auditoria.

Ver roadmap: `agent-emergency-knowledge`, `agent-active-emergency`, `agent-devices-monitoring`.

## Níveis de conversação (futuro)

### 1. Agente de monitoramento e sinais (`monitoring-safety`) — **Fase 1**

**Entrada:** últimas `measurement_observations` (temp, SpO₂, BPM), thread de enfermidade ativa.

**Exemplos:**

- SpO₂ 88% → “Muito abaixo do habitual; pode ser falha de leitura — repita com calma. Se persistir, procure avaliação médica.”
- Febre persistente + timeline de meds → contexto para conversa com pediatra.

**Mecânica:** regras determinísticas (`normal_range.critical*`) **antes** de qualquer LLM; citação `measurement:{id}`.

### 2. Agente de medicação e segurança (`medication-safety`) — **Fase 1**

**Entrada:** alergias, medicações ativas, nome da medicação que o responsável vai registrar.

**Exemplos:**

- Alergia declarada vs. medicamento (match textual).
- Dupla anti-inflamatória (ibuprofeno + nimesulida).
- “Antes de dar X, informe o médico que já usa Y.”

**Mecânica:** regras + base de interações pediátricas comuns (expandir depois); citação `allergy:{id}`, `medication:{id}`.

### 3. Agente de preparo para consulta (`consult-prep`) — **Fase 2**

**Entrada:** `PatientContextService` + timeline + export de monitoramento + eventos agenda próximos.

**Saída:** resumo estruturado para levar ao pediatra (bullet points + citações), reutilizando lógica de `monitoring-export`.

### 4. Agente de evolução e hipóteses (`symptom-evolution`) — **Fase 3 (LLM + gate médico)**

**Entrada:** health thread + sintomas + vitals ao longo do tempo.

**Saída família:** “Com base nos registros A, B, C — **temas para conversar** com o médico.”  
**Saída clínica (futuro):** hipóteses mais sensíveis só em área logada do profissional (`audience: clinical`).

## Modelo de resposta (contrato canônico)

Todas as respostas de apoio seguem o mesmo envelope:

```json
{
  "disclaimer": "Apoio à família. Não substitui pediatra nem emergência.",
  "insights": [
    {
      "kind": "vital_alert",
      "action": "seek_medical_care",
      "priority": "urgent",
      "title": "Saturação baixa",
      "message": "…",
      "citations": [{ "kind": "measurement", "entityId": "…", "label": "SpO₂ 88% em …" }],
      "audience": "family"
    }
  ],
  "generatedAt": "…"
}
```

**Actions (linguagem de produto, não diagnóstico):**

| `action` | Uso |
|----------|-----|
| `verify_reading` | Repetir medida / checar equipamento |
| `discuss_with_doctor` | Conversar na próxima oportunidade |
| `seek_medical_care` | Buscar avaliação (sem “é emergência X”) |
| `inform_doctor` | Lembrar ao médico na consulta |
| `review_before_dose` | Antes de administrar medicação |

## Arquitetura técnica

```
domain/family-support/          # tipos, regras puras
application/family-support/     # orquestra repos + context
infrastructure/http/family-support/
packages/web/.../FamilySupportPanel.tsx
```

- **Fonte da verdade:** Postgres (`measurements`, `allergies`, `medications`, `health_threads`, `scheduled_events`).
- **LLM (fases 2+):** só para **redação** e síntese; fatos vêm do bundle determinístico; temperatura baixa; citações obrigatórias.
- **Créditos:** mesma cascata billing que interpretação de manuscrito (`handwriting_credits`).
- **Legado:** `packages/agents/pediatria` (Python stub) — não é o runtime de produção; Core API absorve agentes de apoio.

## Níveis de conversação (futuro)

| Nível | Quem vê | Conteúdo |
|-------|---------|----------|
| `family` | Responsável na app | Alertas, lembretes, temas para conversa |
| `clinical` | Profissional (portal futuro) | Hipóteses sensíveis, correlações, risco farmacológico detalhado |

Filtro `audience` na API e na UI; logs de auditoria para saídas `clinical`.

## Gates antes de LLM clínico amplo

1. Revisão `aiyracare-review-medical` (tier 3).
2. Atualizar Termos/Privacidade se escopo de “hipóteses” mudar.
3. Registro de decisão em `ANVISA_SAMD_POSITION.md`.
4. Disclaimers fixos na UI (banner persistente no painel de apoio).

## Fase 1 implementada neste repo

- `GET /patients/:id/family-support/insights` — insights por regras (vitals + medicação + alergias).
- UI `FamilySupportPanel` no perfil do paciente (evoluir para dentro do chat Ava).
- Testes unitários das regras.

## Roadmap Ava (sugerido)

| Fase | Entrega |
|------|---------|
| **A** | Chat read-only: Ava responde com contexto PG + skills de regras; sem tools |
| **B** | `symptom-intake`: perguntas guiadas; salvar em `health_thread_entries` com confirmação |
| **C** | Tools confirmados: medidas, medicação, notas; tabelas `ava_conversations` / `ava_messages` |
| **D** | Skill farmácia expandida + billing créditos; soft delete nas entidades tocadas |
| **E** | Hipóteses `audience: clinical`; portal médico |

## Relacionado

- `PatientContextService` — resumo determinístico existente
- `docs/MEASUREMENTS.md` — monitoramento dia-a-dia
- `GET /monitoring-export` — base para consult-prep
- `docs/ROADMAP.md` — épico Agentes
