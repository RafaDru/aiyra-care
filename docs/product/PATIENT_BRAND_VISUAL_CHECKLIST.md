# Checklist — marca e nomenclatura (Produto Paciente)

**Atualizado:** 2026-11-16 · **Espelho:** Project store `patient-brand-visual-checklist-2026-11-16.md` (índice beta familiar)

Marca UI **Ananeri** · agente **Neri**. Status Phase 1: [`REBRAND_STATUS.md`](./REBRAND_STATUS.md) · glossário: [`product-terminology.md`](../product-terminology.md).

## Resumo executivo

| Área | Beta familiar | Polido |
|------|---------------|--------|
| Copy / i18n Paciente | ✅ Ananeri | — |
| Web `AppLogo` + tokens | ✅ | Logo final designer ⏸ |
| Mobile logo PNG | ✅ script `sync-brand-png.mjs` | Ícone loja ☐ |
| Chaves `aiyra-care-*` no cliente | ✅ migradas → `ananeri-*` + fallback | `aiyracare.*` fase 2 |

## Validação

```bash
rg -n 'AiyraCare|Aiyra Care' packages/web/src packages/mobile/src --glob '!**/*.test.*'
npm run test:critical
# Notebook após alterar assets:
node packages/mobile/scripts/sync-brand-png.mjs
npm run qa:run -- --suite auth-entry-flow
npm run qa:run -- --suite mobile-shell-smoke
```

Detalhe completo (superfícies, auditoria, ordem de ondas): ver store do Project **Beta familiar — checklist marca**.