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
  agents/       Python FastAPI (esqueleto)
database/
  relational/   Migrations PostgreSQL
  graph/        Modelo Neo4J (roadmap)
docs/
  PROJETO.md    Documento vivo — arquitetura e operação atual
  HISTORICO.md  Decisões e sessões de desenvolvimento
scripts/
  up.ps1        Sobe API (:3000) + Web (:5173)
  setup-env.ps1 Gera .env local ou cloud
```

## Quick start (local)

```powershell
npm install
.\scripts\setup-env.ps1
.\scripts\up.ps1
```

- Web: http://localhost:5173  
- API: http://localhost:3000/health  

Requer PostgreSQL local (`openhealth`) e variáveis em `.env` (ver `.env.example`).

## Documentação para continuidade (IA / dev)

| Arquivo | Conteúdo |
|---------|----------|
| [docs/PROJETO.md](docs/PROJETO.md) | Stack, entidades, endpoints, fluxos de sync, UI, roadmap |
| [docs/HISTORICO.md](docs/HISTORICO.md) | Histórico cronológico de sessões e decisões |
| [docs/project-context.json](docs/project-context.json) | Foto estruturada da app (curada) para LLM/agentes |
| `GET /project/context` | API: JSON + HISTORICO parseado + migrations |
| [AGENTS.md](AGENTS.md) | Instruções operacionais (subir serviços, Amil CDP, arquivos-chave) |

## Funcionalidades principais hoje

- CRUD completo de pacientes e registros clínicos (vacinas, exames, consultas, medidas, alergias, medicações, arquivos/OCR)
- Import ConecteSUS (gov.br + FHIR)
- **Vínculo e sync Unimed BH** — extrato, autorizações ricas, carteirinha digital (QR/token), plano e carências (parcial)
- **Vínculo e sync Amil** ✅ — plano, carências, guias/tokens; auth silenciosa via sessão salva ou Chrome CDP (validado 2026-07-28)
- **Carteira (WalletTab)** — planos vinculados, sync, QR Unimed, seção Meu plano com carências
