# Hostnames locais (sem registrar domínio)

> **Última atualização:** 2026-09-03  
> Enquanto `aiyracare.com.br` não estiver no ar, use o sufixo **`.test`** na máquina local.

## URLs amigáveis

| Papel | Hostname | Porta real (fallback) |
|-------|----------|---------------------|
| **Staging web** (você) | http://staging.aiyracare.test | `:5174` |
| **Staging API** | http://api.staging.aiyracare.test | `:3020` |
| **Staging ops** | http://ops.staging.aiyracare.test | `:3023` |
| Dev web (agentes) | http://dev.aiyracare.test | `:5173` |
| Dev API | http://api.dev.aiyracare.test | `:3010` |
| Dev ops | http://ops.dev.aiyracare.test | `:3013` |

Produção futura (registrar DNS de verdade):

| Local `.test` | Produção planejada |
|---------------|-------------------|
| `staging.aiyracare.test` | `staging.aiyracare.com.br` ou subdomínio GCP |
| `app.aiyracare.test` | `app.aiyracare.com.br` |
| `api.aiyracare.com.br` | API live |

Marca canonical nos docs legais: **`aiyracare`** (sem hífen). `aiyra-care` pode redirecionar.

## Setup (uma vez)

### 1. Hosts (admin)

```powershell
# Terminal como Administrador
npm run hosts:register
```

### 2. Caddy — proxy porta 80 (admin)

```powershell
winget install Caddy.Caddy   # se ainda não tiver
npm run caddy:local
```

### 3. Ativar URLs no stack

Em `.env.preview` (staging):

```env
AIYRA_LOCAL_HOSTNAMES=1
API_PUBLIC_URL=http://api.staging.aiyracare.test
VITE_OPS_CONSOLE_URL=http://ops.staging.aiyracare.test
```

Opcional em `.env` (dev):

```env
AIYRA_LOCAL_HOSTNAMES=1
```

Subir preview:

```powershell
npm run up:preview
```

Abre **http://staging.aiyracare.test/login** em vez de `:5174`.

## Ritual diário (staging)

```powershell
npm run caddy:local          # se não estiver rodando
npm run up:preview
# → http://staging.aiyracare.test
```

Parar proxy: `npm run caddy:local:stop`

## Sem Caddy

Hosts + portas ainda funcionam:

- http://staging.aiyracare.test:5174
- http://api.staging.aiyracare.test:3020

Menos limpo, mas sem instalar nada além do `hosts:register`.

## Supabase / OAuth

Quando configurar redirect URLs no Supabase, inclua:

- `http://staging.aiyracare.test/**` (preview local)
- `http://localhost:5174/**` (fallback)

## Ver também

- [`TWO_ENV_MODEL.md`](./TWO_ENV_MODEL.md)
- [`ENV_PREVIEW.md`](./ENV_PREVIEW.md)
- [`PREVIEW_LOCAL_TEST_GUIDE.md`](./PREVIEW_LOCAL_TEST_GUIDE.md)
