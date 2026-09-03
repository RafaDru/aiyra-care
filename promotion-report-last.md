# Relatório de promoção — Ambiente 1 (Integração)

**Data:** 2026-09-03T17:22:34.604Z
**Branch:** main
**Commit:** 6fe45d6

## Resumo

| Resultado | ✅ Pode solicitar aprovação |

| Vertical | Checks |
|----------|--------|
| funcional | ✅ API test:critical, Web build, Web E2E smoke |
| integrado | ✅ Validate migrations, DB seed refresh |
| segurança | ✅ API test:critical |
| performance | ✅ staging:probe-gate, test:ops, ops smoke (no HTTP) |

## Detalhe

✅ **API test:critical** (funcional)
✅ **Web build** (funcional)
✅ **Validate migrations** (integrado)
⏭️ **DB seed refresh** (integrado)
   DATABASE_URL não definido
⏭️ **Web E2E smoke** (funcional)
   [WebServer] [plugin vite:reporter]  [WebServer] (!) C:/Users/rafae/Workspace/aiyra-care/packages/web/src/lib/supabase.ts is dynamically imported by C:/Users/rafae/Workspace/aiyra-care/packages/web/src
✅ **staging:probe-gate** (performance)
✅ **test:ops** (performance)
✅ **ops smoke (no HTTP)** (performance)

## Manual pendente (agente deve listar no chat)

- [ ] Sync convênio real (se área tocada)
- [ ] gov.br / SUS (se área tocada)
- [ ] Tier review skills (tier ≥ 2)

## Aprovação Rafael

- [ ] Aprovado para Ambiente 2 (Preview)

---
Ver `docs/TESTING_VERTICALS.md` e `docs/infra/TWO_ENV_MODEL.md`.