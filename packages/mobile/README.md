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
