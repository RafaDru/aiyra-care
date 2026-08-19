# LLM usage metering (Ava MVP)

> Migration **040** · `docs/AGENTS_APOIO.md`

## Modelo

| Tabela | Uso |
|--------|-----|
| `llm_usage_accounts` | Cache `monthly_tokens_used` por `scope_id` (= `accountId`) |
| `llm_usage_events` | Auditoria por chamada (tokens, provider, feature) |

Pool compartilhado com créditos manuscrito (`handwriting_credit_accounts`):

```text
token_budget = (monthlyFreeRemaining + packageCredits) × LLM_TOKENS_PER_CREDIT
tokens_remaining = token_budget − monthly_tokens_used (Ava)
```

Manuscrito consome **crédito** (1×); evento LLM só audita. Ava debita **tokens** reais da API.

## API MVP

```http
GET  /llm/usage/quota
POST /patients/:id/ava/chat   { "message", "healthThreadId?", "allowLlmDataSharing?" }
GET  /billing/me              → inclui `llmUsage`
```

Respostas `402 LLM_QUOTA_EXCEEDED` quando franquia esgotada.

## Env

| Variável | Default | Efeito |
|----------|---------|--------|
| `LLM_TOKENS_PER_CREDIT` | `10000` | 1 crédito manuscrito ≈ N tokens no orçamento |
| `LLM_WARN_AT_PERCENT` | `80` | `status: warn` na quota |
| `LLM_AVA_MAX_OUTPUT_TOKENS` | `1024` | Teto resposta Ava |
| `AVA_LLM_ENABLED` | on se Groq/Gemini/OpenCode Zen/Go | Kill switch |
| `GROQ_CHAT_MODEL` | `qwen/qwen3.6-27b` | Fallback Groq |
| `GEMINI_FLASH_LITE_MODEL` | `gemini-2.5-flash` | Cascata (após OpenCode) |
| `GEMINI_PRO_CHAT_MODEL` | `gemini-3.5-flash-lite` | Fallback Gemini final |
| `GEMINI_CHAT_MODEL` | — | Alias legado → Flash |
| `OPENCODE_API_KEY` | — | Chave compartilhada Zen/Go |
| `OPENCODE_ZEN_API_KEY` | — | Zen pay-as-you-go (`/zen/v1`) |
| `OPENCODE_ZEN_FREE_CHAT_MODEL` | `deepseek-v4-flash-free` | Só com consentimento UI |
| `OPENCODE_ZEN_BASE_URL` | `https://opencode.ai/zen/v1` | Base Zen |
| `OPENCODE_GO_API_KEY` | — | Go ($10/mês — `/go/v1`) |
| `OPENCODE_GO_CHAT_MODEL` | `deepseek-v4-flash` | DeepSeek no Go (0d retenção) |
| `OPENCODE_GO_BASE_URL` | `https://opencode.ai/zen/go/v1` | Base Go |

### Cascata Ava (chat + reflexão)

Ordem de fallback:

1. **OpenCode Zen — DeepSeek Free** — só se `allowLlmDataSharing=true` na requisição (checkbox na UI; default off). Período gratuito pode usar dados para melhorar o modelo ([Zen privacy](https://opencode.ai/docs/zen/privacy)).
2. **OpenCode Go — DeepSeek** — plano Go; **0 dias de retenção, não usado para treino** ([Go privacy](https://opencode.ai/docs/go/privacy)).
3. **Gemini Flash** — `GEMINI_API_KEY`
4. **Groq** — `GROQ_API_KEY` (não xAI Grok)
5. **Gemini Pro / fallback** — modelo mais capaz na conta

Sem consentimento, dados de saúde não passam pelo Zen free — começa em Go (se key) ou Gemini/Groq.

| Provedor / modelo | Retenção (resumo) | Treino |
|-------------------|-------------------|--------|
| Zen DeepSeek Free | pode reter no free tier | pode usar para melhorar modelo |
| Go DeepSeek Flash/Pro | 0 dias | não |
| Go Grok / GPT Luna | ~30 dias | conforme provedor upstream |
| Gemini / Groq | políticas Google / Groq | conforme provedor |

## Telemetria

## Reflexão (motor de qualidade)

Pipeline por turno (`AVA_REFLECTION_ENABLED=1`):

1. **Regras determinísticas** — diagnóstico afirmativo, prescrição de dose, contradição com alertas críticos
2. **Crítica LLM** (JSON curto) — se regras ok
3. **Revisão** (1×) — se crítica ou regras falham (`AVA_REFLECTION_MAX_REVISIONS=1`)

Resposta inclui `reflection: { satisfactory, revised, attempts, steps }` — steps são resumo operacional (não chain-of-thought bruto).

| Env | Default |
|-----|---------|
| `AVA_REFLECTION_ENABLED` | on |
| `AVA_REFLECTION_MAX_REVISIONS` | 1 |
| `AVA_REFLECTION_RESERVE_MULTIPLIER` | 2.5 (reserva de tokens antes do turno) |

## Relacionado

- `docs/AVA_VISION.md` — conversas persistidas, pins, moonshot
- `docs/OBSERVABILITY.md` — telemetria por conta, `product_events`
- `docs/ARCHITECTURE_DATA_LAYERS.md` — Postgres vs Neo4j
