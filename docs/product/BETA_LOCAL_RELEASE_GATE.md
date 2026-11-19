# Beta familiar — gate local antes do staging (Jenifer)

| Campo | Valor |
|-------|--------|
| **Decisão** | 2026-11-17 |
| **Ordem** | **Local PASS (PWA + J1)** → **GCP preview** → **Jenifer / lista** |

Project store (detalhe): `beta-release-local-first-2026-11-17.md`

## Fase A — Local (obrigatória)

1. `scripts/up.ps1` — API `3010`, web `5173`, PG `aiyracare`
2. `npm run beta:bootstrap-legal`
3. PWA: `manifest.webmanifest` + web em **IP LAN** (`http://<LAN>:5173`) — instalar no celular  
   - **Não** usar porta `5180` (inexistente).  
   - `up.ps1` **não** fixa `VITE_API_URL=127.0.0.1` (o celular chamaria o localhost do aparelho); API via **proxy Vite**. Opt-in notebook: `AIYRA_VITE_DIRECT_API=1`.
4. **Supabase LAN (PWA celular):** com PAT no notebook — `SUPABASE_ACCESS_TOKEN=sbp_… AIYRA_LAN_IP=<ip-wifi> npm run supabase:patch-lan` (merge allow list + `site_url` LAN; script já default `192.168.18.77` do último gate)
5. QA: `promotion:gates` + `auth-entry-flow`, `onboarding-flow`, `core-patient-crud`, `family-quick-capture`
6. Walkthrough runbook familiar §2 na URL LAN — **PASS** antes de cloud

Opcional: `npm run up:preview` (`5174` / `3020`) como ensaio do Ambiente 2 local.

## Fase B — Staging GCP

Só após Fase A PASS — ver `family-beta-staging-runbook` (store) e [`GCP_PREVIEW_RUNBOOK.md`](../infra/GCP_PREVIEW_RUNBOOK.md).

## Fase C — Jenifer

PWA no URL preview GCP — [`BETA_MOBILE_CHANNEL_PWA.md`](./BETA_MOBILE_CHANNEL_PWA.md).