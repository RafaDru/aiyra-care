# Open Health

Sistema centralizado de hist\u00F3rico m\u00E9dico infantil.

## Estrutura

```
packages/
  web/          - React + Vite (frontend web)
  mobile/       - React Native + Expo (app mobile)
  api/          - Node.js + TypeScript + Fastify (API principal)
  agents/       - Agentes de IA em Python
    pediatria/   - Assistente pedi\u00E1trico contextual
    integracao/  - Processamento PDF/OCR
    farmaceutico/- Base de medica\u00E7\u00F5es e intera\u00E7\u00F5es
database/
  relational/   - Schemas PostgreSQL
  graph/        - Modelo Neo4J
```

## Setup

```bash
npm install
npx lerna bootstrap  # ou workspaces nativos
```

## Documenta\u00E7\u00E3o

- `docs/PROJETO.md` - Documento vivo com estado atual
- `docs/HISTORICO.md` - Registro incremental de decis\u00F5es
