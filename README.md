# AiyraCare

Plataforma de cuidado infantil com histórico médico centralizado (prontuário familiar).

## Repositório

https://github.com/RafaDru/open-health

## Estrutura

```
packages/
  web/          React 19 + Vite + Ant Design (frontend)
  mobile/       React Native + Expo (esqueleto)
  api/          Node 22 + Fastify 5 + TypeScript (hexagonal)
  connect/      Contrato canônico Connect (Fase 1)
  agents/       Python FastAPI (esqueleto)
database/
  relational/   Migrations PostgreSQL
  graph/        Modelo Neo4J (roadmap)
docs/
  PROJETO.md    Documento vivo — arquitetura e operação atual
  HISTORICO.md  Decisões e sessões de desenvolvimento
  SYNC_DELTA.md Auditoria fetch incremental por portal
  roadmap.json  Roadmap P0–P4 (UI + GET /roadmap)
scripts/
  up.ps1        Sobe API (:3010) + Web (:5173)
  setup-env.ps1 Gera .env local ou cloud
```

## Quick start (local)

```powershell
npm install
.\scripts\setup-env.ps1
.\scripts\up.ps1
```

- Web: http://localhost:5173  
- API: http://127.0.0.1:3010/health  

Requer PostgreSQL local (`openhealth`) e variáveis em `.env` (ver `.env.example`).

## Documentação para continuidade (IA / dev)

| Arquivo | Conteúdo |
|---------|----------|
| [docs/PROJETO.md](docs/PROJETO.md) | Stack, entidades, endpoints, fluxos de sync, UI, roadmap |
| [docs/HISTORICO.md](docs/HISTORICO.md) | Histórico cronológico de sessões e decisões |
| [docs/SYNC_DELTA.md](docs/SYNC_DELTA.md) | Fetch incremental vs import dedup por portal |
| [docs/roadmap.json](docs/roadmap.json) | Roadmap priorizado (P0–P4) |
| [docs/project-context.json](docs/project-context.json) | Foto estruturada da app (curada) para LLM/agentes |
| `GET /project/context` | API: JSON + HISTORICO parseado + migrations |
| [AGENTS.md](AGENTS.md) | Instruções operacionais (subir serviços, Amil CDP, arquivos-chave) |

## Funcionalidades principais hoje

- CRUD completo de pacientes e registros clínicos (vacinas, exames, consultas, medidas, alergias, medicações, arquivos/OCR)
- Import ConecteSUS (gov.br + FHIR)
- **Vínculo e sync Unimed BH** — extrato, autorizações, carteirinha digital (QR/token), plano
- **Vínculo e sync Amil** — plano, carências, guias/tokens; JWT + API HTTP; CDP só quando necessário
- **Carteira** — 3 abas (Carteirinhas, Convênios, Integrações); **sync silencioso** ao abrir Carteirinhas (`sessionReady`); novelty nos cards
- **Integrações** — sync manual, dock com SSE, histórico por data
- Mater Dei + Hermes Pardini (Hermes: BFF exames pendente)
- Trilhas de saúde (Acompanhamento), contexto clínico determinístico, Neo4j MVP
