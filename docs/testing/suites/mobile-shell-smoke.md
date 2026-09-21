# Suite — `mobile-shell-smoke`

| Campo | Valor |
|-------|--------|
| **ID** | `mobile-shell-smoke` |
| **Feature** | `mobile-app-shell` |
| **Lane** | `mobile` |
| **Fixture** | `core-demo` (conta com pacientes demo) |
| **parallelSafe** | `false` |
| **Automação** | `manual` (+ checks estruturais abaixo) |

## Pré-requisitos

- [ ] API `:3010` saudável (`npm run env:status`)
- [ ] `packages/mobile/.env` com `EXPO_PUBLIC_SUPABASE_*` e `EXPO_PUBLIC_API_URL`
- [ ] Opcional dispositivo: Expo Go + mesma rede; `EXPO_PUBLIC_API_URL` = IP LAN da API
- [ ] Massa: paciente com exames e carteira no web (demo ou sync prévio)

## Checks estruturais (agente / CI local)

```bash
cd packages/mobile && npm run typecheck
cd packages/mobile && npx expo export --platform web
```

Registrar PASS/FAIL antes do smoke manual.

## Passos — Expo Web ou Expo Go

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | `cd packages/mobile && npm run web` (ou `npm run mobile:web` na raiz) | Metro sobe sem erro | |
| 1b | Abrir app sem sessão | Tela **welcome** → Entrar ou Criar conta | |
| 2a | Alternar **Criar conta** → cadastro e-mail/senha + aceite legal | Conta criada ou e-mail de confirmação (Supabase) | |
| 2b | Login **e-mail/senha** (conta QA) | Lista Início com pacientes | |
| 3 | Abrir um paciente | Seletor de seção/tab visível | |
| 4 | Seção **Plano** → tab **Carteira** | Cartões CNS/convênio ou empty state; pull-to-refresh recarrega | |
| 4b | Seção **Plano** → tab **Convênios** | Lista de planos ou empty state; link web | |
| 5 | Seção **Clínico** → tab **Exames** | Lista de exames (data, laboratório, origem) ou empty state; pull-to-refresh | |
| 6 | Link «Abrir … no navegador» (Carteira ou Exames) | Abre web no tab correto | |
| 7 | Logout → **Continuar com Google** (opcional se Google habilitado no Supabase) | Retorna autenticado; lista carrega | |
| 8 | Repetir passos 4–5 após login Google | Mesmo comportamento | |

## Notas

- **Sem** `POST /integration-links/:id/sync` no mobile — sync só no web.
- Redirect OAuth: scheme `aiyracare://auth/callback` — ver `packages/mobile/README.md` e `docs/SUPABASE.md`.
- Orquestrador: `npm run qa:run -- --suite mobile-shell-smoke` · estrutural rápido: `npm run mobile:check`.

## Relatório

Formato em `docs/testing/QA_PROCESS.md` — PASS se todos os passos + typecheck/export PASS.
