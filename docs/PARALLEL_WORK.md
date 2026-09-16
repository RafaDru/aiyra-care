# Trabalho paralelo — Operação vs PoC Fleury

> Como paralelizar o **modelo operacional** (`docs/OPERATION_MODEL.md`) com integração **Grupo Fleury / Precision Care** sem conflito de merge.

## Linhas de trabalho

| Linha | Foco | Pastas típicas | Conflito |
|-------|------|----------------|----------|
| **A — Operação (Fase 1)** | Sondas, alertas infra, banner Carteira | `domain/ops/*`, `scripts/ops-*`, `connect-worker/src/ops-*`, `WalletCardsTab`, `wallet-sync-banner` | Baixo com Fleury |
| **E — Ambientes + Ops dual** | Integração vs Preview, gates, setup ops por env | `docs/infra/TWO_ENV_*`, `OPS_TWO_ENV_SETUP`, `setup-ops-preview` | Baixo com features se keys separadas |
| **B — PoC Fleury** | Auth Precision, marca, probes CLI | `hermes-pardini-*`, `probe-fleury-*`, `scripts/lib/fleury-*` | Baixo com A |
| **C — Fase 2 cache** | `data_generations`, `/account/freshness` | `database/`, `patient-context`, `AuthContext` | Médio — após Fleury estável |
| **D — Integração Fleury prod** | Portal type, sync service, integration-link | `integration-link-sync`, scrapers, `INSURANCE_PORTALS` | Sequencial após B |

## Paralelizar com segurança

### Pode ir em paralelo agora

- **A completa Fase 1** (probe, alertas infra, banner, ops snapshot) enquanto **B** evolui probes Fleury.
- **Testes:** `ops-alerts.test.ts` vs `hermes-pardini*.test.ts` — independentes.
- **Docs:** `OPERATION_MODEL.md` vs notas Fleury em scripts.

### Evitar no mesmo PR (merge chato)

- Editar **o mesmo** arquivo `hermes-pardini-login.helper.ts` / `hermes-pardini.portal.ts` em ambas as linhas.
- Se B precisa mudar login Hermes, **congelar A** nesses arquivos ou integrar B primeiro.

### Depois que Fleury integrar (linha D)

- Bump `data_generations` no sync OK deve incluir portal `hermes_pardini` / futuro `fleury_precision`.
- `evaluateOpsAlerts` já agrupa por `portal_type` — novo portal entra automaticamente em fail rate.
- Banner Carteira: adicionar label em `wallet-sync-banner.ts` se portal novo na Carteira.
- PoC scripts (`probe:fleury-auth`) viram testes de fumaça opcionais em Fase 1 (`ops:probe` separado).

## Ordem sugerida combinada

```text
Paralelo imediato:
  A: Fase 1 P0 (probe + banner)     │  B: PoC Fleury auth + marca + testes

Sequencial curto:
  D: Hermes/Fleury no sync prod    →  bump generations (Fase 2)

Paralelo depois:
  A: Fase 2 freshness              │  D: refinamento Fleury (laudos, delta)
  A: Fase 3 client errors            │  (sem overlap)
```

## Critério “pronto para integrar Fleury”

- [ ] PoC auth + marca estável (`probe:fleury-marca` OK)
- [ ] Session/probe no scraper Hermes alinhado com unified Fleury
- [ ] Fase 1 ops rodando (probe + webhook) — detecta se sync novo quebra infra

## Referências

- `docs/OPERATION_MODEL.md` §13–§14 — fases e P0
- `packages/api/scripts/probe-fleury-precision-*.mjs` — PoC B
- `npm run ops:probe` — PoC A
