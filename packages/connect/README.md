# @aiyra-care/connect

Contrato e registry do **Aiyra Connect** — motor de integração (connectores, sync, credenciais).

**Fase 1:** pacote TypeScript no monorepo (tipos + `CONNECTOR_REGISTRY` + payload canônico). Scrapers ainda em `packages/api`; orquestração em `PortalSyncOrchestrator`.

**Sync incremental:** janelas por portal em `packages/api/src/application/connect/sync-delta.helper.ts` — ver `docs/SYNC_DELTA.md`.

Documentação: [`docs/CONNECT.md`](../../docs/CONNECT.md)
