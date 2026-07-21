# Histórico do Projeto Open Health

## [2026-07-21] - Fundação do Projeto

### Contexto
Criação do Open Health, um sistema para centralizar e gerenciar o hist\u00F3rico m\u00E9dico dos filhos,
eliminando a necessidade de repetir informa\u00E7\u00F5es a cada nova consulta m\u00E9dica.

### Crian\u00E7as Cadastradas
- **Lu\u00EDs Drummond Freitas Reis** - Nasc: 23/01/2020 - 20kg
- **Bruno Drummond Freitas Reis** - Nasc: 26/10/2022 - 14kg

### Decis\u00F5es Arquiteturais
| Decis\u00E3o | Op\u00E7\u00E3o | Motivo |
|-------------|---------|---------|
| Reposit\u00F3rio | open-health (GitHub) | Novo reposit\u00F3rio dedicado |
| Banco Relacional | PostgreSQL (Cloud SQL) | Free Tier GCP, robusto |
| Banco de Grafos | Neo4J AuraDB Free | Free Tier gerenciado |
| Mobile | React Native + Expo | Multiplataforma |
| Web | React + Vite | Performance e simplicidade |
| Backend | Node.js + TypeScript | Tipagem forte, ecossistema rico |
| Agentes | Python (FastAPI) | Bibliotecas de IA/ML maduras |
| GCP | Novo projeto (pendente) | Aguardando cria\u00E7\u00E3o manual |

### Estrutura do Projeto
```
open-health/
\u251C\u2500\u2500 .github/workflows/   # CI/CD
\u251C\u2500\u2500 docs/                   # Documenta\u00E7\u00E3o viva e hist\u00F3rico
\u251C\u2500\u2500 packages/
\u2502   \u251C\u2500\u2500 web/               # React (Vite)
\u2502   \u251C\u2500\u2500 mobile/            # React Native (Expo)
\u2502   \u251C\u2500\u2500 api/               # Node.js/TypeScript
\u2502   \u251C\u2500\u2500 agents/
\u2502       \u251C\u2500\u2500 pediatria/       # Agente de Pediatria
\u2502       \u251C\u2500\u2500 integracao/      # PDF/OCR/Prontu\u00E1rios
\u2502       \u251C\u2500\u2500 farmaceutico/    # Medica\u00E7\u00F5es e Intera\u00E7\u00F5es
\u251C\u2500\u2500 database/
\u2502   \u251C\u2500\u2500 relational/        # Schemas PostgreSQL
\u2502   \u251C\u2500\u2500 graph/             # Schemas Neo4J
\u251C\u2500\u2500 .env.example
\u251C\u2500\u2500 package.json
\u251C\u2500\u2500 tsconfig.base.json
\u2514\u2500\u2500 README.md
```

### Pend\u00EAncias
- [ ] Criar projeto GCP manualmente (usu\u00E1rio far\u00E1)
- [ ] Configurar Cloud SQL PostgreSQL
- [ ] Configurar AuraDB Neo4J
- [ ] Definir esquemas de dados iniciais
- [ ] Implementar modelos de dom\u00EDnio
