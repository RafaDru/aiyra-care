# Open Health - Documento Vivo do Projeto

> **\u00DAltima atualiza\u00E7\u00E3o:** 2026-07-21
> **Status:** Funda\u00E7\u00E3o / Setup Inicial
> **Reposit\u00F3rio:** https://github.com/RafaDru/open-health

---

## Miss\u00E3o
Centralizar o hist\u00F3rico m\u00E9dico das crian\u00E7as em um \u00FAnico ecossistema,
acess\u00EDvel para consultas, relat\u00F3rios e compartilhamento com profissionais de sa\u00FAde.

## Crian\u00E7as

| Nome | Nascimento | Peso | Alergias | Condi\u00E7\u00F5es |
|------|-----------|------|----------|----------------|
| Lu\u00EDs Drummond Freitas Reis | 23/01/2020 | 20kg | TBD | TBD |
| Bruno Drummond Freitas Reis | 26/10/2022 | 14kg | TBD | TBD |

## Stack Tecnol\u00F3gica

### Frontend
- **Web:** React 18 + Vite + TypeScript + TailwindCSS
- **Mobile:** React Native 0.76+ + Expo SDK 52+

### Backend
- **API Principal:** Node.js 22 + TypeScript + Fastify
- **Agentes IA:** Python 3.12 + FastAPI + LangChain

### Banco de Dados
- **Relacional:** PostgreSQL 16 (GCP Cloud SQL Free Tier)
- **Grafos:** Neo4J 5 (AuraDB Free)

### Infraestrutura
- **Cloud:** Google Cloud Platform (projeto pr\u00F3prio pendente)
- **CI/CD:** GitHub Actions
- **Container:** Docker (desenvolvimento local)

---

## Arquitetura de Dados

### PostgreSQL - Entidades
- `patients` - dados cadastrais das crian\u00E7as
- `medical_records` - consultas, exames, diagn\u00F3sticos
- `medications` - medica\u00E7\u00F5es prescritas e administradas
- `vaccines` - carteira de vacina\u00E7\u00E3o
- `allergies` - alergias registradas
- `exams` - exames laboratoriais e de imagem
- `documents` - metadados de documentos importados
- `growth_records` - peso/altura/IMC por data

### Neo4J - Relacionamentos
- `(:Patient)-[:HAS_CONDITION]->(:Condition)`
- `(:Patient)-[:ALLERGIC_TO]->(:Allergen)`
- `(:Patient)-[:PRESCRIBED]->(:Medication)-[:INTERACTS_WITH]->(:Medication)`
- `(:Doctor)-[:ATTENDED]->(:Appointment)-[:FOR]->(:Patient)`
- `(:Document)-[:MENTIONS]->(:Patient|Condition|Medication)`
- `(:Symptom)-[:LED_TO]->(:Diagnosis)-[:RESULTED_IN]->(:Treatment)`

---

## Agentes de IA

### 1. Agente de Pediatria (`packages/agents/pediatria/`)
**Fun\u00E7\u00E3o:** Assistente pessoal com contexto completo das crian\u00E7as.
Gera resumos pr\u00E9-consulta, alertas de desenvolvimento, acompanhamento vacinal.
**Nunca esquece:** Manter hist\u00F3rico completo de cada crian\u00E7a.

### 2. Agente de Integra\u00E7\u00E3o (`packages/agents/integracao/`)
**Fun\u00E7\u00E3o:** Processamento de documentos externos.
- OCR em imagens de receitas e exames
- Extra\u00E7\u00E3o de dados de PDFs de prontu\u00E1rios
- Classifica\u00E7\u00E3o autom\u00E1tica de documentos

### 3. Agente Farmac\u00EAutico (`packages/agents/farmaceutico/`)
**Fun\u00E7\u00E3o:** Base de conhecimento sobre medica\u00E7\u00F5es.
- Intera\u00E7\u00F5es medicamentosas
- Dosagem pedi\u00E1trica por peso
- Alertas de contraindica\u00E7\u00E3o

---

## Pr\u00F3ximos Passos

### Fase 1 - Funda\u00E7\u00E3o (atual)
1. ~~Criar reposit\u00F3rio GitHub~~
2. Criar projeto GCP (manual)
3. Configurar Cloud SQL PostgreSQL
4. Configurar AuraDB Neo4J
5. Definir schemas iniciais
6. Estruturar API b\u00E1sica

### Fase 2 - N\u00FAcleo
7. CRUD de pacientes
8. Registro de consultas e sintomas
9. Upload e processamento de documentos
10. Integra\u00E7\u00E3o com agentes IA

### Fase 3 - Intelig\u00EAncia
11. Agente pediatria operacional
12. Agente integra\u00E7\u00E3o (OCR/PDF)
13. Agente farmac\u00EAutico
14. Relat\u00F3rios pr\u00E9-consulta

### Fase 4 - Entrega
15. Frontend web funcional
16. App mobile funcional
17. Compartilhamento com m\u00E9dicos
18. Backup e exporta\u00E7\u00E3o de dados
