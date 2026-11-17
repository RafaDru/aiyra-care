# Beta familiar — canal mobile: PWA (interim)

| Campo | Valor |
|-------|--------|
| **Decisão** | 2026-11-17 (Rafael) |
| **Vigência** | Até **D-U-N-S** + conta Play organizacional liberarem trilha Android |
| **Canal primário** | Web preview GCP como **PWA** (atalho na tela inicial) |
| **Canal pausado** | Google Play / EAS (`MOBILE_STAGING_DISTRIBUTION.md`) |

## Escopo

- **Inclui:** `packages/web` no host preview · `manifest.webmanifest` · convite por link.
- **Não inclui nesta fase:** distribuição Play, TestFlight, Expo Go para lista 5–15.
- **Nativo:** código `packages/mobile` segue no repo; **não** é canal de beta até D-U-N-S.

## URL (staging)

Usar a URL **web** do runbook familiar (Cloud Run preview). Exemplo documentado em 2026-11-16:

`https://ananeri-preview-web-kzp5ynymva-uc.a.run.app`

Auth e API já apontam para o mesmo ambiente via build preview — testers **não** usam IP local.

## Instalação (instrução para testadores)

**Android (Chrome):** abrir o link → menu (⋮) → **Instalar app** ou **Adicionar à tela inicial**.

**iPhone (Safari):** compartilhar → **Adicionar à Tela de Início**.

Abrir sempre pelo ícone **Ananeri** (modo `standalone`), não por aba solta do navegador.

## Copy de convite (beta)

> Você foi convidado ao **beta Ananeri** (versão preview na nuvem).  
> 1. Abra no celular: **{WEB_PREVIEW_URL}**  
> 2. Faça login (Google ou e-mail).  
> 3. Instale na tela inicial (menu do navegador).  
> Não substitui médico ou emergência. Termos e privacidade dentro do app.

Ver LGPD completo: runbook store `family-beta-staging-runbook-2026-11-16.md` §4.3.

## QA

| Check | Comando / nota |
|-------|----------------|
| Manifest servido | `GET /manifest.webmanifest` → 200 |
| J1 no preview | `npm run qa:run -- --suite auth-entry-flow` (notebook/host preview) |
| Instalar + login no device | Manual — critério semana 1 esposa |

## Retomada Play (pós-D-U-N-S)

1. Concluir conta Play organizacional.
2. Seguir `MOBILE_STAGING_DISTRIBUTION.md` (`preview-aab`).
3. Opcional: manter PWA como fallback iOS / quem não entra na lista Play.

**Project store:** `beta-mobile-channel-pwa-interim-2026-11-17.md`