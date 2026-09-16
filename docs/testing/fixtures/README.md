# Fixtures — massas de teste QA

> Cada fixture é um **mundo isolado** para uma ou mais suites. Ver [`PARALLEL_QA_MODEL.md`](../PARALLEL_QA_MODEL.md).

## Aplicar fixture

| Fixture | Comando | Banco |
|---------|---------|-------|
| `core-demo` | `npm run seed:staging-refresh` + `$env:AUTH_SUBJECT="<sub>"; npm run link:demo-patients` | `DATABASE_URL` ativo |
| `family-matrix` | `node packages/api/scripts/seed-qa-family-matrix.mjs` **(planejado)** | idem |
| `ops-local` | `npm run setup:ops-prod` (keys locais) | N/A |

**Dev:** `up.ps1` força PG `aiyracare`. **Preview:** `up:preview` → `aiyracare_preview`.

## Arquivos

| Arquivo | Descrição |
|---------|-----------|
| [`core-demo.json`](./core-demo.json) | Lucas + Ana, links demo Unimed/Amil |
| [`family-matrix.json`](./family-matrix.json) | Personas João/Maria/Francisco/Vitória/Mariana |

## Schema (JSON)

```json
{
  "id": "fixture-id",
  "title": "…",
  "database": "aiyracare | aiyracare_preview | ephemeral-ci",
  "seedScript": "npm run …",
  "accounts": [{ "label": "…", "authSubject": "uuid", "email": "qa+…@…" }],
  "patients": [{ "label": "…", "id": "uuid-fixo-opcional" }],
  "notes": []
}
```

Não commitar senhas — apenas `auth_subject` UUID e instrução “usar conta Supabase de teste do Rafael”.
