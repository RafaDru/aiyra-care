# CH — autenticação de operador (Supabase JWT)

**Status:** implementado (v1)  
**Porta:** ops-console `:3013` (preview `:3023`)  
**Relacionado:** [`CH_ACCESS.md`](./CH_ACCESS.md) · [`CH_OPS_CALLBACK_TUNNEL_SPEC.md`](./CH_OPS_CALLBACK_TUNNEL_SPEC.md) · [`CONSOLE.md`](./CONSOLE.md)

---

## 1. Objetivo

Restringir o **Command Hub** a operadores humanos autorizados antes de qualquer exposição pública (túnel Cloudflare, preview GCP, etc.). Usuários finais do app B2C **não** recebem link do CH no menu.

---

## 2. Modelo (v1)

| Camada | Comportamento |
|--------|----------------|
| **Identidade** | Mesmo projeto **Supabase Auth** do app (`SUPABASE_URL` + service role no servidor; anon key no client Vite). |
| **Sessão UI** | `@supabase/supabase-js` no ops-console — magic link ou Google OAuth (mesmas contas do app). |
| **API CH** | Header `Authorization: Bearer <access_token>`; validação via `auth.getUser` (service role). |
| **Autorização** | Allowlist `OPS_CONSOLE_OPERATOR_EMAILS` (e-mails separados por vírgula, case-insensitive). |

Callbacks de automação e webhooks **não** usam JWT — mantêm auth própria (sem enfraquecimento).

---

## 3. Variáveis de ambiente

| Variável | Obrigatória quando auth on | Descrição |
|----------|---------------------------|-----------|
| `OPS_CONSOLE_AUTH_ENABLED` | — | `1`/`0`. Default **on** em `preview` e `production`; default **off** em `integration` (`:3013` notebook). |
| `OPS_CONSOLE_OPERATOR_EMAILS` | Sim (auth on) | Ex.: `rafael@seudominio.com,ops@ananeri.dev` |
| `SUPABASE_URL` | Sim (auth on) | Mesmo do app |
| `SUPABASE_SERVICE_ROLE` | Sim (auth on) | Verificação JWT no ops-console |
| `VITE_SUPABASE_URL` | Sim (login UI) | Carregado do `.env` raiz pelo Vite do CH |
| `VITE_SUPABASE_ANON_KEY` | Sim (login UI) | Anon key Supabase |

**Preview/prod:** tratar `OPS_CONSOLE_AUTH_ENABLED=1` como padrão implícito (sem precisar setar).  
**Notebook:** pode usar `OPS_CONSOLE_AUTH_ENABLED=0` **somente** com `OPS_CONSOLE_HOST=127.0.0.1` (ou `localhost`). Bind público **ignora** `=0` e mantém auth ativo.

Adicionar **redirect URL** do CH no painel Supabase (magic link / OAuth), ex. `http://127.0.0.1:3013/**` e host do túnel/preview.

---

## 4. Rotas isentas de JWT (machine-to-machine)

| Rota | Auth própria |
|------|----------------|
| `GET /health` | Probe mínima |
| `GET /api/auth/status` | Bootstrap do client |
| Assets estáticos / Vite (`/@…`, `/src/…`, extensão de arquivo) | Shell SPA + login |
| `POST /api/analysis-queue/callback` | `x-investigator-callback-key` / `x-internal-ops-key` |
| `POST /api/analysis-queue/:id/triage-started` | idem |
| `POST /api/platform-defects/review-callback` | idem |
| `POST /api/platform-defects/callback` | idem (spec; rota futura/alternativa) |
| `POST /api/webhooks/github/defect-ci` | `X-Hub-Signature-256` |
| `POST /api/webhooks/github/defect-merge` | idem |

Todas as demais rotas `/api/*` e o uso operacional da UI exigem operador allowlisted.

---

## 5. Fluxo do operador

1. Abrir CH (ex. [`CH_ACCESS.md`](./CH_ACCESS.md) — link de **Defeitos**).
2. Se auth ativa: tela **Command Hub — Acesso restrito**.
3. Login (magic link ou Google) com conta Supabase.
4. Servidor confirma JWT + e-mail na allowlist → UI carrega.
5. Requests do client enviam `Authorization: Bearer …` automaticamente.

Erros comuns:

| HTTP | `code` | Causa |
|------|--------|-------|
| 401 | `OPS_CONSOLE_AUTH_REQUIRED` | Sem token |
| 403 | `OPS_CONSOLE_OPERATOR_DENIED` | Token válido, e-mail fora da allowlist |
| 503 | `OPS_CONSOLE_SUPABASE_MISSING` | Env Supabase ausente |
| 503 | `OPS_CONSOLE_OPERATOR_ALLOWLIST_EMPTY` | Allowlist vazia |

`GET /health` expõe `operatorAuthEnabled: boolean`.

---

## 6. Dev bypass (notebook)

```env
OPS_CONSOLE_HOST=127.0.0.1
OPS_CONSOLE_AUTH_ENABLED=0
```

**Aviso:** só em máquina local confiável. Não usar com túnel público ou bind `0.0.0.0` sem auth.

---

## 7. Implementação

| Artefato | Caminho |
|----------|---------|
| Config + exempt paths | `packages/ops-console/src/operator-auth.ts` |
| Hook Fastify | `packages/ops-console/src/operator-auth.hook.ts` |
| Login UI | `packages/ops-console/src/client/ChOperatorLogin.tsx` |
| Vitest | `packages/api/tests/ops-console-operator-auth.test.ts` |

---

## 8. Checklist antes de túnel / exposição pública

1. `OPS_CONSOLE_OPERATOR_EMAILS` com e-mails dos operadores.
2. `GET /health` → `operatorAuthEnabled: true`.
3. Browser anônimo em `:3013` → só login, sem dados.
4. Callback de teste com header investigator → `200` (sem JWT).
5. Webhook GitHub test delivery → `200`/`401` assinatura, não `401` JWT.