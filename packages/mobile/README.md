# App mobile (React Native + Expo)

**Expo SDK 57** (React Native 0.86, React 19) — compatível com **Expo Go** atual (App Store / Play Store). Projeto anterior em SDK 52 não abria no Expo Go 57.

Shell alinhado ao web: Supabase auth (e-mail/senha + **Google OAuth**), API `:3010`, navegação por tabs + perfil paciente (seções overview/clinical/plan/files).

**Entrega dual:** ver [`docs/MOBILE_WEB_DUAL_DELIVERY.md`](../../docs/MOBILE_WEB_DUAL_DELIVERY.md) — regra 80/20 web + mobile na mesma entrega de produto.

## Dev rápido (notebook / máquina nova)

1. **Atualizar código:** `git pull origin main`
2. **Dependências (raiz do monorepo):** `npm install`
3. **Variáveis:** `cd packages/mobile && cp .env.example .env` — Supabase + **IP LAN** em `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WEB_APP_URL` e `EXPO_PUBLIC_OAUTH_REDIRECT_URI` (nunca `localhost` no celular). Ver `docs/SUPABASE.md`.
4. **API local:** subir stack com API em **http://127.0.0.1:3010** (`npm run env:status` na raiz)
5. **Expo web:** `npm run web` (ou na raiz `npm run mobile:web`)

## Expo Go (dispositivo)

1. Instale **Expo Go** (iOS/Android) — versão **SDK 57** (padrão nas lojas em 2026).
2. **Mesmo Wi‑Fi:** `npm run mobile:lan` — define `EXPO_PUBLIC_API_URL` + `REACT_NATIVE_PACKAGER_HOSTNAME` (IP LAN), grava `exp://<IP>:8081` em `.expo-url.txt`, `expo start --lan --clear` (sem `CI=1`).
3. **Na rua (4G):** API no PC + `npm run mobile:street` — túnel **localtunnel** na `:3010` + Metro **Expo tunnel**; escaneie o QR. O notebook precisa ficar ligado com internet.
4. Dev simples (só emulador/web): `npm run mobile:start`.
5. Smoke manual: suite [`mobile-shell-smoke`](../../docs/testing/suites/mobile-shell-smoke.md) · `npm run qa:run:mobile`

**App “igual ao de antes”?** Feche o Expo Go, use `--clear` (já nos scripts acima) e confira o branch (`git pull` em `cursor/mobile-auth-ux-i18n-a5c1` ou `main` após merge).

## Comandos

```bash
cd packages/mobile
npm run web            # Expo web (dev)
npm run typecheck      # tsc --noEmit
npx expo export --platform web   # build estático web (smoke / screenshots)

# Raiz do monorepo
npm run mobile:check   # typecheck + export web
npm run qa:run:mobile  # imprime checklist mobile-shell-smoke
```

Plano de paridade: Project store `docs/mobile-parity-plan.md` · feature `docs/features/mobile-app-shell.md`

## Deep links

| Rota | Uso |
|------|-----|
| `aiyracare://invite/accept?token=…` | Aceitar convite de família (espelho web `/invite/accept`) |
| `aiyracare://auth/callback` | Retorno OAuth Supabase (Google) |
| Expo Web dev | URL exibida por `npx expo start` (Metro) |

## Google OAuth (mobile)

Fluxo alinhado ao web (`signInWithOAuth({ provider: 'google' })`) via `expo-auth-session` + `expo-web-browser` — ver `src/lib/supabase-oauth.ts`.

### UX alvo (produto)

- **Um toque** em «Continuar com Google» → Custom Tab → conta Google → **volta ao app já logado**.
- Sem mensagem «Login cancelado» quando o Google concluiu.
- A bridge web (`/mobile-oauth-return`) só repassa tokens ao app via deep link `exp://…/auth/callback` — o usuário **não** precisa «fechar o browser» manualmente na versão final (hoje pode ver «Abrindo o AiyraCare…» por 1–2s).

Bridge: `packages/web/src/pages/auth/mobile-oauth-return.tsx` · deep link: `packages/web/src/lib/mobile-oauth-deep-link.ts`.

1. **Supabase Dashboard** → Authentication → URL Configuration — adicionar redirect URLs:
   - `aiyracare://auth/callback`
   - `exp://**` (Expo Go)
   - URL do Expo web em dev (ex. `http://localhost:8081/**` — conferir porta do Metro)
2. **Google Cloud** — mesmo OAuth client Web do projeto (callback Supabase inalterado).
3. Botão **Continuar com Google** na tela de login mobile; e-mail/senha permanece disponível.

**Limites conhecidos (fase atual):**

- Sem Microsoft OAuth no mobile (só web).
- Sync de portais / scrapers **somente no web** — mobile mostra status + links.
- Upload de exames, marcadores e QR Unimed: abrir tab no navegador.

## Compliance (gate)

Após login, o app chama `GET /compliance/status` (como web `RequireCompliance`) e redireciona para `/(app)/compliance/accept` quando há pendência — independente de `COMPLIANCE_GATE_ENABLED` na API.

## Conteúdo read-only (paridade)

| Tab mobile | API |
|------------|-----|
| **Carteira** | `GET /patients/:id`, `/integration-links`, `/plan-memberships` |
| **Exames** | `GET /exams?patientId=` |

## Ava (M5)

- FAB **Ava** em todas as telas autenticadas (`AvaGlobalDock`).
- Chat usa o mesmo endpoint do web com SSE de atividade (`docs/AVA_OPERATIONAL.md`).

## Integrações / sync (M6)

- Aba **Integrações**: polling `GET /integration-links/:id/sync-status`.
- **Sem** `POST …/sync` no mobile — CTAs «Abrir no navegador» (`EXPO_PUBLIC_WEB_APP_URL`).
