# Mobile beta — distribuição staging (Android-first)

| Campo | Valor |
|-------|--------|
| **Decisão** | 2026-11-16 |
| **Produto** | Paciente B2C (beta familiar) |
| **Espelho store** | Project store `mobile-staging-distribution-2026-11-16.md` |

## Estratégia

- **Expo** = toolchain de build (`packages/mobile`, EAS).
- **Google Play** (teste **interno** → **fechado**) = como convidados instalam e recebem updates.
- **Expo Go** apenas semana 1 em casa (você + esposa); não escalar para lista 5–15.

Relacionado: Project store `family-beta-staging-runbook-2026-11-16.md` · [`GCP_PREVIEW_RUNBOOK.md`](../infra/GCP_PREVIEW_RUNBOOK.md) · [`mobile-app-shell.md`](../features/mobile-app-shell.md).

## Ambiente preview (build)

Variáveis embutidas no perfil `preview-aab` de `packages/mobile/eas.json` (URLs Run atuais). Secrets no EAS:

| Secret EAS | Origem |
|------------|--------|
| `EXPO_PUBLIC_SUPABASE_URL` | Projeto staging Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Dashboard Supabase (público, mas não commitar) |

Supabase **Redirect URLs** para build loja: `aiyracare://auth/callback` (sem `exp://`). Ver `packages/mobile/README.md` § Google OAuth.

## Perfis `eas.json`

| Perfil | Quando | Saída |
|--------|--------|-------|
| `development` | Dev client | Interno EAS |
| `preview` | APK rápido | APK interno |
| `preview-aab` | **Beta Play** | AAB → submit trilha `internal` |

```bash
cd packages/mobile
eas build --profile preview-aab --platform android
eas submit --profile preview-aab --platform android
```

## Play Console

1. Criar app **Ananeri** · `applicationId` **`br.com.ananeri.preview`** (`app.json`).
2. **Teste interno** → convites e-mail → expandir **teste fechado** semana 2.
3. Privacidade: URL web preview `/privacidade` até domínio final.

## Pré-requisitos Rafael (uma vez)

- Conta Google Play Developer (~US$ 25 única).
- `eas login` + `eas init` (agente registra `projectId` em `app.json`).
- Google OAuth: SHA-1 da assinatura Android (credenciais EAS).

## Release ritual (agente)

1. Preview GCP web+API healthy.
2. Bump `version` / `android.versionCode` em `app.json`.
3. `eas build` + `eas submit` trilha internal.
4. Smoke: login Google + compliance no APK (device físico).

## Fora de escopo v1

- TestFlight / iOS (documentado no store como opcional).
- Expo Go para lista fechada.
- Consultório / segundo applicationId.