# Runbook — teste manual solicitável

> **Última atualização:** 2026-09-08  
> Use quando Rafael ou o agente pedir: *“rode o teste completo de X”*, *“valida família”*, *“regressão antes do push”*.

## Solicitação típica (chat)

Frases que disparam este runbook:

| Pedido | Comando |
|--------|---------|
| “Testa a feature família” | `npm run qa:run -- --suite family-access-matrix` |
| “Regressão completa antes do push” | `npm run qa:run-all -- --lane regression` |
| “Lista o que temos de QA” | `npm run qa:list` |
| “Testa no preview” | acrescentar `--preview` |

O agente deve **ler a suite `.md`**, executar pré-checks, guiar ou executar passos no browser, e entregar relatório no formato de [`QA_PROCESS.md`](./QA_PROCESS.md).

---

## Passo a passo do executor (agente ou humano)

### 1. Pré-voo

```powershell
npm run env:status
npm run qa:run -- --suite <id>    # imprime checklist + verifica API/web
```

Confirmar:

- [ ] API `/health` responde 200
- [ ] Web carrega `/login`
- [ ] Fixture aplicada (mensagem do script ou rodar seed indicado na suite)
- [ ] Credenciais de teste disponíveis (Supabase — ver fixture)

### 2. Executar checklist

Abrir `docs/testing/suites/<suite-id>.md` e seguir **cada passo** na ordem.

- Marcar ✅ / ❌ / ⚠️ por linha
- Em falha: screenshot, URL, mensagem de erro, trecho relevante de `api.log` / `web.log`
- Não pular passos “porque já testamos ontem” em regressão `main`

### 3. Relatório

Postar no chat ou PR o bloco padrão (ver `QA_PROCESS.md`).

### 4. Pós-falha

| Tipo | Ação |
|------|------|
| Bug produto | Corrigir → re-rodar **mesma suite** |
| Massa desatualizada | Reaplicar fixture → re-rodar |
| Ambiente (PG/migration) | `migrate:all` no banco correto → re-rodar |
| Portal externo | ⚠️ BLOCKED — não bloquear merge se lane `integration-portal` opcional |

---

## Regressão completa (`main`)

```powershell
npm run qa:run-all -- --lane regression
```

Ordem **sequencial** (compartilham `core-demo`):

1. `regression-smoke` — páginas públicas
2. `core-auth-dashboard` — login → pacientes → abrir perfil
3. `family-access-matrix` — matriz João/Maria/Francisco/Vitória/Mariana *(quando fixture pronta)*
4. `ops-health` — `/health`, `/ops/metrics` *(se `OPS_METRICS_KEY` definida)*

**Veredito global:** FAIL se qualquer suite obrigatória falhar.

---

## Execução paralela (várias features)

Quando várias suites `parallelSafe: true` com fixtures diferentes:

```powershell
# Terminal 1 — família
npm run qa:run -- --suite family-access-matrix

# Terminal 2 — Amil (conta portal dedicada)
npm run qa:run -- --suite amil-sync-options

# Terminal 3 — Ops
npm run qa:run -- --suite ops-health
```

Ou pedir ao agente: *“rode em paralelo as suites X, Y e Z”* — três subagentes/browser tabs, massas isoladas.

Ver [`PARALLEL_QA_MODEL.md`](./PARALLEL_QA_MODEL.md).

---

## Credenciais e LGPD

- Massas QA usam dados **fictícios** ou demo seed — nunca PHI real em relatórios.
- Relatórios de falha: URLs e mensagens de erro OK; **não** colar tokens JWT, CPF real, conteúdo clínico.
- Contas Supabase de teste: documentar apenas `auth_subject` UUID na fixture, não senha no repo.

---

## Template de nova suite

Copiar [`suites/_TEMPLATE.md`](./suites/_TEMPLATE.md) e registrar em [`suites/index.json`](./suites/index.json).
