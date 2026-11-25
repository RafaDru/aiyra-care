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

### C — Macro 2×2 + sub-abas compact (P0-7, X3 + X4)

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Perfil compact | Macro em grade 2×2 (`patient-macro-sections-compact`); rótulos completos (não «Histór…») | |
| 2 | Macro ativo | Tom **soft** (lavanda), não roxo sólido de CTA | |
| 3 | Perfil → **Clínico** | **PAT-2b:** ☰ + carrossel peek; menu abre lista completa; chips 44px alinhados | |
| 4 | Trocar chip / item da lista | Conteúdo da aba muda; rail centraliza item ativo | |

### D — Drawer Neri 100vw (P0-6)

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Abrir chat Neri no compact | Drawer sem corte lateral; chips/avatar visíveis | |
| 2 | Classe | `ava-chat-drawer--compact` no portal | |

### E — Loading centralizado (X2)

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Recarregar home (sessão ok) | Spinner centralizado (`centered-page-loading`) | |
| 2 | Abrir perfil | Mesmo padrão no load inicial | |

## Regressão

`npm run qa:run -- --suite pwa-mobile-patient-ux` · também `pwa-mobile-shell` após mudanças em `AppLayout`.