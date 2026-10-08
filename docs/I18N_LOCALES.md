# Locales e i18n (web)

> **Última atualização:** 2026-10-08  
> Relacionado: [`product-terminology.md`](./product-terminology.md), [`FEATURE_REVIEW_FRAMEWORK.md`](./FEATURE_REVIEW_FRAMEWORK.md) (tier 0 copy)

## Escopo MVP

| Locale | Código | Status |
|--------|--------|--------|
| Português (Brasil) | `pt-BR` | **Obrigatório** — fallback padrão |
| English | `en` | **Obrigatório** — paridade de chaves com pt-BR |
| Español | `es` | **Planejado** — **fora do MVP** (decisão produto 2026-10-08); **não** adicionar `es.json` até abrir épico dedicado |

Mobile (`packages/mobile/src/i18n/locales/`) segue a mesma regra MVP: apenas `pt-BR` + `en`.

## Regras de implementação

1. **Somente chaves `t()`** — nenhuma string de UI hardcoded em PT/EN (toasts, `title=`, `placeholder=`, `label=`, colunas de tabela, `okText`, etc.). Identificadores técnicos, logs e ops internos podem permanecer em PT quando não são UI de usuário final.
2. **Arquivos canônicos (web):** `packages/web/src/i18n/locales/pt-BR.json` e `en.json` — mesmas chaves nos dois arquivos.
3. **Novas chaves:** adicionar em **pt-BR e en** no mesmo PR; nomes estáveis por domínio (`toast.*`, `modals.*`, `form.*`, `patient.*`, …).
4. **API / sync:** preferir `messageKey` + `messageParams` no cliente; ver padrão na auditoria (backlog API).

## Verificação

```bash
npm run i18n:check
```

O script (`scripts/i18n-check.mjs`) falha o CI local se `pt-BR.json` e `en.json` divergirem. Rodar antes de merge em qualquer PR que toque copy ou locales.

Ferramentas auxiliares (auditoria pontual): `scripts/i18n-audit-count.mjs`, extratores clínicos em `scripts/i18n-extract-copy-modules.mjs` / `i18n-merge-clinical-keys.mjs`.

## Trabalho restante (pós-auditoria 2026-10-08)

Auditoria detalhada e backlog priorizado: **Project Context** [`/cursor/stores/self/docs/i18n-audit-2026-10-08.md`](/cursor/stores/self/docs/i18n-audit-2026-10-08.md) (agentes Cursor).

Resumo para planejamento:

- **Web:** ~55 `placeholder=`, ~90 `label=`, ~6 títulos de modal; copy inline em sync/scraper (ex. `SyncProgressModal`, `PublicHealthIntegrationModal`); papéis em `health-thread-link-roles`; colunas Ant Design ainda literais.
- **Mobile:** telas de alto tráfego com PT inline (`_layout`, integrações, carteira, modais legais) — reutilizar nomes de chave do web quando o UX coincidir.
- **API:** mensagens de job de sync e HTTP `message` em PT — migrar para `messageKey` conforme auditoria.

**Feito na auditoria:** paridade pt/en (~1466 chaves, `i18n:check` PASS); toasts `message.*` eliminados; módulos `clinical-sequence-copy` / `clinical-export-copy` em i18n; dezenas de modais e formulários de paciente/dashboard.

## Quando adicionar `es`

1. Decisão explícita no roadmap (pós-MVP).
2. Criar `es.json` espelhando todas as chaves de `pt-BR.json`.
3. Estender `i18n:check` (ou script irmão) para exigir paridade **três vias**.
4. Revisão tier 2 se copy clínica / Ava / legal for traduzida — ver [`FEATURE_REVIEW_FRAMEWORK.md`](./FEATURE_REVIEW_FRAMEWORK.md).
