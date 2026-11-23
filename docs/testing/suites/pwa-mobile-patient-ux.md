# Suite — `pwa-mobile-patient-ux`

| Campo | Valor |
|-------|--------|
| **ID** | `pwa-mobile-patient-ux` |
| **Domínio** | paciente / PWA compact |
| **Lane** | `regression` |
| **Feature** | `beta-pwa-mobile-shell` |
| **Fixture** | `core-demo` (opcional) |
| **Automação** | parcial (`packages/web/e2e/suites/pwa-mobile-patient-ux.spec.ts`) |

Melhorias Rafael 2026-11-23: dia a dia pós-cadastro, loading centralizado, sub-abas compact, copy onboarding.

## Pré-requisitos

- Viewport ≤768px ou PWA `standalone`
- Credenciais QA se rodar E2E

## Cenários

### A — Dia a dia atualiza após novo perfil (X1)

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Home com zero pessoas → **Adicionar perfil** → salvar | Lista mostra novo perfil | |
| 2 | Sem reload manual | Bloco **Dia a dia da família** + **Hoje** visíveis com lente do novo perfil | |

### B — Copy onboarding só na home vazia (B5)

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Home com zero pessoas | Texto «Que bom ter você aqui…» no card Dia a dia | |
| 2 | Abrir perfil → visão geral sem histórico clínico | **Sem** o mesmo parágrafo de boas-vindas no painel família | |

### C — Sub-abas compact (X3 + X4)

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Perfil → seção **Clínico** | Grade de chips (`patient-sub-tabs-compact`), rótulos completos (ex.: Histórico, Arquivos) | |
| 2 | Trocar chip | Conteúdo da aba muda; sem carrossel horizontal de tabs Ant | |

### D — Loading centralizado (X2)

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Recarregar home (sessão ok) | Spinner centralizado (`centered-page-loading`) | |
| 2 | Abrir perfil | Mesmo padrão no load inicial | |

## Regressão

`npm run qa:run -- --suite pwa-mobile-patient-ux` · também `pwa-mobile-shell` após mudanças em `AppLayout`.