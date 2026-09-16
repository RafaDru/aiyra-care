# ConecteSUS e dados públicos (SUS)

> Importação **guiada** via gov.br — sessão persistida na **conta** após o primeiro login (reimport sem browser enquanto o token FHIR é válido, tipicamente ~1h).

## Arquitetura (hexagonal)

| Camada | Responsabilidade |
|--------|------------------|
| **domain** | Sem entidade SUS dedicada; dedup/higienização usa `source: conectesus` |
| **application** | `GovBrSessionService`, `PublicHealthScrapeService` — orquestra token + fetch |
| **infrastructure** | `GovBrTokenSession` (browser gov.br), `ConecteSUSGateway` / `CadernetaGateway` (FHIR HTTP), `govbr-session.pg.repository` |
| **Core UI** | `PublicHealthIntegrationModal`, coluna Sessão em Integrações |

**Segregação:** fluxo SUS **não** passa por `IntegrationLinkSyncService` nem `integration_links` (exceto convênios). Token gov.br em `govbr_sessions` por `account_id` — mesmo padrão de `calendar_connections`.

Migration **053**: `database/relational/053_govbr_sessions_auth_attention.sql` — `apply-migration-053.mjs`.

## O que existe hoje

| Fluxo | Onde na UI | API |
|-------|------------|-----|
| **ConecteSUS** | Integrações; Carteira (sync silencioso); Vacinas (banner) | `POST /scraper/conectesus`, `POST /patients/:id/conectesus/sync` |
| **Caderneta Digital** | Integrações → import guiado | `POST /scraper/caderneta` |
| **Sessão gov.br** | Coluna Sessão (Integrações) | `GET /account/govbr-session` |
| **Vacinas / exames FHIR** | Preview no modal → Importar | `ConecteSUSGateway.fetchAll` |

- Connector Connect: `conectesus` — categoria `government`, auth `interactive_govbr`.
- Dedup no import (score ≥ 88) — ver `docs/DATA_HYGIENE.md`.
- `source: conectesus` em vacinas e exames; `SourceTag` mostra logo ConecteSUS.

### Fluxo (primeira vs reimport)

```
Primeira busca:
  UI → POST /scraper/conectesus
    → GovBrSessionService (sem token válido)
    → Chrome + login gov.br → captura govbr-proxy token
    → persiste govbr_sessions (cifrado)
    → FHIR HTTP (vacinas + exames) → preview → usuário Importar

Reimport com sessão (HTTP + import automático):
  Carteira aberta → POST /patients/:id/conectesus/sync?silent=1
    → scrapeConecteSUSPersisted (sem browser)
    → ConecteSUSImportService (dedup servidor)
```

Import **guiado** (modal): busca + preview + botão Importar. **Sync silencioso** na Carteira: fetch + import sem modal quando `govbr_session.sessionReady` e dados stale (6h, alinhado a `VITE_SILENT_SYNC_STALE_MS`).

## Limitações (por design do portal)

- Login **interativo** na primeira vez ou após expirar — sync silencioso **não** abre browser.
- Sync silencioso na Carteira quando `sessionReady` + CPF do paciente (import server-side com dedup).

## Próximos passos (roadmap)

| Prioridade | Entrega | ID roadmap |
|------------|---------|------------|
| ~~P1~~ | Sync silenciente Carteira + reimport UX Vacinas | `sus-reimport-ux` ✅ |
| P2 | Lembrete reimport (6–12 meses) | `sus-reminder` ✅ |
| P2 | Expandir FHIR / RNDS quando estável | — |
| P3 | Connector worker government (Connect Fase 2) | — |

## Referências no código

| Área | Path |
|------|------|
| Orquestração | `packages/api/src/application/scraper/public-health-scrape.service.ts` |
| Sync + import | `packages/api/src/application/conectesus/conectesus-sync.service.ts` |
| Sessão conta | `packages/api/src/application/govbr/govbr-session.service.ts` |
| Token + browser | `packages/api/src/infrastructure/govbr/govbr-token-session.ts` |
| FHIR ConecteSUS | `packages/api/src/infrastructure/conectesus/conectesus-gateway.ts` |
| Caderneta API | `packages/api/src/infrastructure/caderneta/caderneta-gateway.ts` |
| HTTP scraper | `packages/api/src/infrastructure/http/scraper/scraper.controller.ts` |
| Status sessão | `packages/api/src/infrastructure/http/govbr/govbr-session.routes.ts` |
| UI modal | `packages/web/src/components/integrations/PublicHealthIntegrationModal.tsx` |
| Connect registry | `packages/connect/src/registry/connectors.ts` |
