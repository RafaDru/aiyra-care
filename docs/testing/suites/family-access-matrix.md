# Suite — `family-access-matrix`

| Campo | Valor |
|-------|--------|
| **ID** | `family-access-matrix` |
| **Feature** | [`family-access-model`](../../features/family-access-model.md) |
| **Lane** | `regression` (obrigatória) + `feature` |
| **Fixture** | `family-matrix` |
| **parallelSafe** | `true` (após seed dedicado) |
| **Automação** | `planned` — **bloqueada** até `seed-qa-family-matrix.mjs` |

## Pré-requisitos

- [ ] Migrations 057–063 + 062 audit aplicadas no banco ativo
- [ ] `node packages/api/scripts/seed-qa-family-matrix.mjs` **(quando existir)**
- [ ] 4 contas Supabase de teste (João, Maria, Francisco, Vitória) — ver [`fixtures/family-matrix.json`](../fixtures/family-matrix.json)
- [ ] `RESEND_API_KEY` opcional — testar e-mail em preview

## Matriz de visibilidade (referência)

| Conta | Deve ver | Não deve ver |
|-------|----------|--------------|
| João | Pedro, Lucas, Mariana | Henrique |
| Maria | Pedro, Lucas | Mariana, Henrique |
| Francisco | Henrique | Pedro, Lucas |
| Vitória | Mariana | Pedro, Lucas, Henrique |

## Passos — Família A (João)

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Login como João | Dashboard carrega | |
| 2 | Verificar pacientes | Pedro, Lucas, Mariana listados | |
| 3 | `/settings/family` | Círculo Família A visível; João owner | |
| 4 | Convitar Maria (se não existir) | Convite criado; e-mail ou link pendente | |
| 5 | Login Maria → aceitar convite | Maria entra no círculo | |
| 6 | Login Maria → dashboard | Pedro e Lucas sim; **Mariana não** | |
| 7 | João → ajustar grant Mariana para Maria | Maria passa a ver Mariana (se produto permitir) ou confirmar restrição | |

## Passos — Família B (Francisco / Vitória)

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 8 | Login Francisco | Henrique visível; Mariana se profile share ativo | |
| 9 | Login Vitória | Mariana visível | |
| 10 | Vitória não vê Henrique | Lista sem Henrique | |

## Passos — Caso Mariana (profile share)

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 11 | João → profile share Mariana para círculo B | Convite/share pendente | |
| 12 | Francisco ou Vitória aceita | Mariana aparece no círculo B sem duplicar registro clínico | |
| 13 | Revogar share | Mariana some do círculo B; permanece em A | |

## Passos — Audit (062)

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 14 | Após grant/revoke | Entrada em audit log (API ou UI se exposta) | |

## Notas

- Cenário de negócio: [`FAMILY_ACCESS_MODEL.md`](../../FAMILY_ACCESS_MODEL.md)
- Até o seed existir: executar setup manual seguindo a matriz ou marcar suite ⚠️ BLOCKED
- `parallelSafe: true` — não usar fixture `core-demo` na mesma janela de tempo
