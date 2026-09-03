# Template — Relatório de promoção (Ambiente 1 → Preview)

> Geração automática: `npm run promotion:gates` → `promotion-report-last.md`  
> O agente complementa seções **Manual** e **Decisão**.

---

## Meta

| Campo | Valor |
|-------|--------|
| Data | |
| Branch / commit | |
| Autor (agente/dev) | |
| Tier feature | 0–3 |
| Resumo (1 linha) | |

## Resultado automático

| Vertical | Status | Notas |
|----------|--------|-------|
| Funcional (critical + web build) | ✅ / ❌ | |
| Funcional (E2E smoke) | ✅ / ❌ / skip | |
| Integrado (migrations) | ✅ / ❌ | |
| Integrado (DB seed) | ✅ / ❌ / skip | |
| Segurança (critical subset) | ✅ / ❌ | |
| Performance (probe) | ✅ / ❌ / skip | |

## ✅ Passou

- 

## ❌ Falhou

- 

## ⚠️ Precisa de decisão (Rafael)

- 

## 🔧 Manual pendente (antes ou depois do preview)

- [ ] Sync convênio real
- [ ] gov.br / ConecteSUS
- [ ] Billing Stripe test checkout
- [ ] Outro: 

## Aprovação

- [ ] Rafael aprovou promoção ao **Ambiente 2 (Preview)**
- Promovido em: ___ por workflow `promote-preview.yml`

---

## Comandos de referência

```powershell
npm run promotion:gates
cd packages/api && npm run staging:probe-gate
```
