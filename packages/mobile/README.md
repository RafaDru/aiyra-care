# App mobile (React Native + Expo)

Shell alinhado ao web: Supabase auth, API `:3010`, navegação por tabs + perfil paciente (seções overview/clinical/plan/files).

## Comandos

```bash
cd packages/mobile
cp .env.example .env   # preencher chaves Supabase
npm install
npm run web            # Expo web
npm run typecheck
```

Raiz: `npm run mobile:start`

Plano de paridade: Project store `docs/mobile-parity-plan.md` · feature `docs/features/mobile-app-shell.md`
