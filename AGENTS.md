# Project Instructions for OpenCode

## Starting Services
When user says "up", "sobe", "sobe os serviços", or "restart", run:
```
taskkill /F /IM node.exe 2>&1 | Out-Null
Start-Sleep 2
powershell -File "C:\Users\rafae\Documents\Filhos\scripts\up.ps1" *>$null
```
Always use `*>$null` to suppress output so the chat doesn't get stuck.

## API & Web
- API: http://localhost:3000/health
- Web: http://localhost:5173
- Logs: api.log and web.log in project root

## Cursor Cloud specific instructions

This runs on a **Linux VM**. The "Starting Services" section above is Windows/PowerShell only (author's machine) and does NOT apply here — start services with the npm scripts below instead.

Services (all run from the repo root):
- **API** (`packages/api`, Fastify + TS): `npm run api:dev` → `tsx watch`, port 3000. Dev mode does NOT type-check. Env is read from `packages/api/.env` (git-ignored; already created with the local DB config). Check with `curl localhost:3000/health` and `/health/db`.
- **Web** (`packages/web`, React 19 + Vite + Ant Design): `npm run web:dev`, port 5173. Calls the API at `http://localhost:3000` (override via `VITE_API_URL`).
- **Agents** (`packages/agents/*`, optional Python FastAPI): activate the shared venv first (`source .venv-agents/bin/activate`), then e.g. `npm run agent:pediatria` (uvicorn). CI only checks that each agent imports.

PostgreSQL (required for all API CRUD / the web app to show data):
- Installed via apt; not auto-started. Start each session with `sudo pg_ctlcluster 16 main start`.
- DB `openhealth`, user `postgres` / password `postgres123`. Schema in `database/relational/*.sql` is already loaded into the snapshot; only re-run those SQL files if you recreate the DB.

Neo4j: NOT installed. It only affects the `neo4j` field of `/health/db`; no domain logic depends on it, so it is safe to ignore.

Known caveats:
- `npm run build` (tsc) in `packages/api` currently fails with pre-existing type errors in `scraper.controller.ts` and `session.controller.ts`. This does not affect `api:dev` (tsx skips type-checking).
- Root `lint`/`test` scripts are placeholders (`echo` only); no real lint/test framework is configured.
