# Grupo Fleury — Precision Care (Hermes Pardini e marcas)

> **Status:** PoC em andamento (2026-08-31)  
> **Código:** `packages/api/src/infrastructure/scraper/hermes-pardini.*`  
> **Roadmap:** épico `fleury-precision-care`

## Contexto corporativo

O **Instituto Hermes Pardini** foi combinado ao **Grupo Fleury** (anúncio 2022; consolidação contábil desde abril/2023). Em 2024–2025 a integração operacional de sistemas foi concluída — lab-to-lab, plantas e processos unificados.

Para o paciente, o grupo promove o **Precision Care**: uma conta e um portal para **todas as marcas** (Fleury, Pardini, a+, Labs a+, etc.). Referência pública: [precisioncare.med.br/paciente](https://precisioncare.med.br/paciente).

**Implicação para AiyraCare:** não existe backend “só Hermes” separado do Fleury no portal de resultados. A integração atual já usa infraestrutura Fleury; o trabalho pendente é **autenticação unificada (OTP)** e **multi-marca** nos headers de API.

---

## Arquitetura técnica (já mapeada)

| Camada | URL / identificador |
|--------|---------------------|
| Portal SPA | `https://resultados.grupofleury.com.br` |
| Entrada Pardini | `?origin=pardini` |
| Entrada unificada | raiz sem `origin` (OTP SMS/e-mail/WhatsApp) |
| API exames | `https://api-plataforma.grupofleury.com.br/precision-care/paciente/api/v1` |
| Keycloak | `https://sso.grupofleury.com.br/auth/realms/grupopardini` |
| Client OAuth (Pardini) | `precision_care_pardini` |

### Endpoints usados no sync

| Método | Rota | Uso |
|--------|------|-----|
| GET | `/pedidos` | Lista pedidos (paginada) |
| GET | `/pedidos/{id}/exames` | Itens do pedido |
| POST | `/pedidos/{id}/download` | PDF do laudo |

Constantes em `hermes-pardini.portal.ts` (`HERMES_PARDINI_PRECISION_CARE`).

### Headers de marca (API paciente)

A API exige contexto de marca em cada request. Perfis PoC em `FLEURY_PRECISION_MARCA_PROFILES`:

| Perfil | `marca-selecionada` | `grupo` |
|--------|---------------------|---------|
| `pardini` | `pardini` | `grupo-pardini` |
| `fleury` | `fleury` | `grupo-fleury` |
| `a_mais` | `a+` | `grupo-fleury` |
| `labs_a` | `labs-a+` | `grupo-fleury` |
| `none` | (vazio — teste) | |

Valores `fleury` / `a+` / `labs-a+` são **hipóteses** validadas pelo script `probe:fleury-marca`.

O sync de produção usa perfil `pardini` (`HERMES_PARDINI_PACIENTE_API_DEFAULT_HEADERS`).

---

## Autenticação

| Fluxo | Suporte AiyraCare | Notas |
|-------|-------------------|-------|
| ROPC CPF + senha protocolo | Diagnóstico only (`loginHermesPardiniApi`) | Token frequentemente **não** autoriza `GET /pedidos` |
| Browser PKCE + senha protocolo | Sync manual (`HERMES_PARDINI_ALLOW_BROWSER=1`) | Fallback se OTP falhar (`?origin=pardini`) |
| CPF + data nascimento | Portal default | Não automatizado |
| **OTP SMS / e-mail / WhatsApp** | **Sync manual** (`FLEURY_PRECISION_UNIFIED_LOGIN=1`, default) | `FLEURY_PRECISION_OTP_IN_APP=1` (default): modal no app + `POST …/sync-progress/:jobId/otp`; `0` = hint Chrome |
| Refresh token | Sim (`refreshHermesPardiniApi`) | Após login browser ou OTP |

Sessão persistida: `encrypted_session_token` + `pacienteApiHeaders` (replay HTTP).

---

## Hipóteses da PoC

1. **Mesma API** — `paciente/api/v1` serve Pardini e outras marcas; diferença nos headers `marca-*` / `grupo`.
2. **Token unificado** — login OTP no portal raiz emite token válido para exames Pardini (como observado manualmente).
3. **Um connector futuro** — `grupo_fleury_precision_care` com token único + perfis de marca, em vez de duplicar integrações por laboratório.
4. **Client OAuth** — pode existir `precision_care_fleury` ou outro `client_id` no fluxo unificado; capturar no probe de rede.

---

## Scripts de PoC

Pré-requisitos: API/web opcionais; `.env` com `DATABASE_URL`, `CRYPTO_KEY`; para sync password `--password` precisa vínculo `hermes_pardini`.

```powershell
cd packages/api

# 1) Login interativo OTP (browser abre — complete SMS/WhatsApp/e-mail)
npm run probe:fleury-auth

# 2) Login senha protocolo (vínculo DB) + entrada Pardini
npm run probe:fleury-auth -- --password --pardini

# 3) Salvar token completo no artefato local (não commitar)
# Adicione ao .env: FLEURY_PROBE_SAVE_FULL_TOKEN=1
npm run probe:fleury-auth

# 4) Testar perfis de marca
npm run probe:fleury-marca
```

**Artefato:** `packages/api/scripts/output/fleury-precision-probe.json` (gitignored).

**Variáveis opcionais (.env):**

| Variável | Uso |
|----------|-----|
| `FLEURY_PROBE_SAVE_FULL_TOKEN=1` | Salva access token no artefato para `probe:fleury-marca` |
| `FLEURY_PROBE_ACCESS_TOKEN` | Bearer manual para marca probe sem re-login |
| `HERMES_PARDINI_ALLOW_BROWSER=1` | Sync produção com browser |

---

## Fluxo recomendado (PoC manual)

1. `npm run probe:fleury-auth` (OTP, entrada unificada).
2. Completar login no Chromium.
3. Verificar log `[NET 200] .../pedidos`.
4. `FLEURY_PROBE_SAVE_FULL_TOKEN=1` → re-run auth ou copiar token para `FLEURY_PROBE_ACCESS_TOKEN`.
5. `npm run probe:fleury-marca` → comparar contagem de pedidos por perfil.
6. Documentar `client_id` e headers capturados no artefato.

---

## Integração AiyraCare hoje

| Item | Estado |
|------|--------|
| Portal type `hermes_pardini` | Produção |
| Sync delta `computeHermesPardiniExamStartDate` | Produção |
| PDF laudo por pedido | Produção |
| Login OTP unificado | Sync manual (`FLEURY_PRECISION_UNIFIED_LOGIN=1`, default) | `FleuryOtpSyncInput` + `hermes-pardini-otp-session.ts` |
| UI «Grupo Fleury» (fase 1) | Integrações, sync, carteira | Card + busca + logos submarcas |
| UI laboratório nos exames (fase 2) | Aba Exames + timeline | Badge marca + selo grupo + filtro |
| Connector multi-marca Fleury | Planejado | Connect `grupo_fleury_precision_care` |

Arquivos principais:

- `hermes-pardini.portal.ts` — URLs e perfis de marca
- `hermes-pardini-auth.ts` — token / refresh
- `hermes-pardini-login.helper.ts` — browser PKCE + `openFleuryPrecisionUnifiedPortal`
- `hermes-pardini-bff.service.ts` — fetch exames
- `hermes-pardini-sync.scraper.ts` — orquestração sync

### UI e branding (fase 1 — 2026-09-01)

| Área | Entrega |
|------|---------|
| Nova integração | Card **Grupo Fleury — Precision Care**, busca (Pardini, Fleury, a+, Labs a+) |
| Vínculo técnico | Um `portal_type` `hermes_pardini` (Precision Care) |
| Chips / sync | Label **Grupo Fleury**; `brandForPortal` mapeia `hermes_pardini` → `fleury_group` |
| Logos | `packages/web/public/brands/fleury/` — Grupo (SVG CDN), submarcas PNG |

**Fontes de logo:** Grupo Fleury e a+/Labs a+ via CDN oficial (`d3unpzxgfygi8m.cloudfront.net`); Fleury lab wordmark do kit interno; Hermes Pardini PNG até kit oficial (central de downloads Grupo Fleury). Ver `fleury-group-config.ts`.

---

## Próximos passos (produto)

| Prioridade | Entrega |
|------------|---------|
| P0 | Validar PoC OTP + perfis marca (scripts) |
| P1 | ~~Sync OTP in-app (modal código SMS/WhatsApp)~~ | done |
| P3 | Connector Connect `grupo_fleury` com `marca` configurável |
| P2 | Landing — família Fleury (texto; logos com jurídico) |
| Legal | Kit oficial de logos + revisão scraping/termos |

---

## Referências internas

- `docs/HISTORICO.md` — Hermes BFF 2026-08-12
- `docs/SYNC_DELTA.md` — janela Hermes
- `docs/CONNECT.md` — boundary Connect
- `AGENTS.md` — sync Hermes Pardini

## Referências externas

- [Grupo Fleury + Pardini — VEJA](https://veja.abril.com.br/economia/lucro-do-grupo-fleury-cresce-32-em-2024-puxado-por-consolidacao-com-hermes-pardini/)
- [Precision Care — Paciente](https://precisioncare.med.br/paciente)
- [Portal resultados](https://resultados.grupofleury.com.br)
