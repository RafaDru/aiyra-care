# Relatório de promoção — Ambiente 1 (Integração)

**Data:** 2026-09-03T18:04:59.349Z
**Branch:** main
**Commit:** 65e89a1

## Resumo

| Resultado | ✅ Pode solicitar aprovação |

| Vertical | Checks |
|----------|--------|
| funcional | ✅ API test:critical, Web build, Web E2E smoke |
| integrado | ✅ Validate migrations, DB seed refresh |
| segurança | ✅ API test:critical, validate ops dual keys |
| performance | ✅ staging:probe-gate, test:ops, ops smoke (no HTTP) |

## Detalhe

✅ **API test:critical** (funcional)
✅ **Web build** (funcional)
✅ **Validate migrations** (integrado)
⏭️ **DB seed refresh** (integrado)
   DATABASE_URL não definido
✅ **Web E2E smoke** (funcional)
✅ **staging:probe-gate** (performance)
✅ **test:ops** (performance)
✅ **ops smoke (no HTTP)** (performance)
✅ **validate ops dual keys** (segurança)

## Manual pendente (agente deve listar no chat)

- [ ] Sync convênio real (se área tocada)
- [ ] gov.br / SUS (se área tocada)
- [ ] Tier review skills (tier ≥ 2)

## Aprovação Rafael

- [ ] Aprovado para Ambiente 2 (Preview)

---
Ver `docs/TESTING_VERTICALS.md` e `docs/infra/TWO_ENV_MODEL.md`.