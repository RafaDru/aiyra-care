# App mobile (React Native + Expo)

Shell alinhado ao web: Supabase auth, API `:3010`, navegação por tabs + perfil paciente (seções overview/clinical/plan/files).

## Dev rápido (notebook / máquina nova)

1. **Atualizar código:** `git pull origin main`
2. **Dependências (raiz do monorepo):** `npm install`
3. **Variáveis:** `cd packages/mobile && cp .env.example .env` — preencher `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (mesmo projeto do web; ver `docs/SUPABASE.md`) e `EXPO_PUBLIC_API_URL` (default `http://127.0.0.1:3010`)
4. **API local:** subir stack com API em **http://127.0.0.1:3010** (`npm run env:status` na raiz)
5. **Expo web:** `npm run web` (ou na raiz `npm run mobile:start`)

## Comandos

```bash
cd packages/mobile
npm run web            # Expo web (dev)
npm run typecheck      # tsc --noEmit
npx expo export --platform web   # build estático web (smoke / screenshots)
```

Plano de paridade: Project store `docs/mobile-parity-plan.md` · feature `docs/features/mobile-app-shell.md`

## Deep links e OAuth (M4)

| Rota | Uso |
|------|-----|
| `aiyracare://invite/accept?token=…` | Aceitar convite de família (espelho web `/invite/accept`) |
| Expo Web | `http://localhost:8081/invite/accept?token=…` (porta do Metro) |

**Google OAuth:** fase 1 continua **e-mail/senha** (`signInWithPassword`). Para OAuth nativo:

1. Configurar redirect URLs no Supabase: `exp://**`, `aiyracare://**` e URL do Expo web em dev.
2. Usar `expo-auth-session` + `supabase.auth.signInWithOAuth` (M5+ ou PR dedicado).
3. Em dispositivo físico, `EXPO_PUBLIC_API_URL` deve apontar para IP LAN da API (`:3010`), não `127.0.0.1`.

## Compliance (gate)

Após login, o app chama `GET /compliance/status` (como web `RequireCompliance`) e redireciona para `/(app)/compliance/accept` quando há pendência — independente de `COMPLIANCE_GATE_ENABLED` na API.

## Ava (M5)

- FAB **Ava** em todas as telas autenticadas (`AvaGlobalDock`).
- Chat usa o mesmo endpoint do web com SSE de atividade (`docs/AVA_OPERATIONAL.md`).
- Para abrir o chat com paciente/mensagem pré-definidos (aceleradores futuros): `requestAvaOpen` em `src/lib/ava-dock-bus.ts`.

## Integrações / sync (M6)

- Aba **Integrações** no perfil do paciente: status via `GET /integration-links/:id/sync-status` (polling).
- O app **não** chama `POST …/sync` — login nos portais e Playwright ficam no **app web**.
- Defina `EXPO_PUBLIC_WEB_APP_URL` (default `http://localhost:5173`) para os links «Sincronizar no navegador».
