# Ava — visão de produto e arquitetura

> **Última atualização:** 2026-08-25  
> Lente de paciente: `docs/AVA_PATIENT_LENS.md`
> Moonshot: companheira de cuidado (doula digital) — organiza, transparenta, não substitui o médico.  
> Arquitetura de dados: `docs/ARCHITECTURE_DATA_LAYERS.md`  
> Observabilidade: `docs/OBSERVABILITY.md`  
> Higienização: `docs/DATA_HYGIENE.md`  
> LLM metering: `docs/LLM_USAGE.md`

## Posicionamento

Ava é a **interface conversacional** da plataforma de apoio à vida do cuidador:

- Lembra o que a família contou (histórico persistido).
- Sabe **o que está no contexto** desta interação (pins visíveis).
- Organiza o prontuário para a conversa com o **pediatra** (e no futuro outros profissionais).
- **Não diagnostica** — política em `docs/AGENTS_APOIO.md` e motor de reflexão.

Horizonte: export rico para médico, portabilidade para operadora (com consentimento), apoio psicológico **supervisionado** (fase tardia, gate médico + legal).

## Onde Ava mora no app

| Hoje | Direção |
|------|---------|
| **Orb global fixo (FAB)** em todas as telas via `AppLayout` — seletor de paciente no drawer; lente: rota → último → `self` → fallback | **Global na conta** (`account_id`) com conversas persistidas |
| Histórico só no browser | **Persistido no servidor** |
| Contexto = prontuário inteiro do paciente da URL | **Pins** + slices por entidade |

O componente é `AvaGlobalDock` (`packages/web/src/components/ava/AvaGlobalDock.tsx`) montado no `AppLayout`; o widget de perfil (`AvaDockWidget`) foi removido do header do paciente. O paciente continua importante como **lente** e atalho (“Falar sobre Luís”), não como único container da experiência.

## Renderização rica e aceleradores

- **Respostas em markdown (GFM):** tabelas comparativas, listas, negrito — o system prompt da Ava instrui uso de tabelas para múltiplos exames/marcadores; render via `AvaMarkdown` (`react-markdown` + `remark-gfm`).
- **Relatório:** botão "Relatório" abre modal dedicado com a conversa formatada + **Imprimir / Salvar PDF** (janela de impressão com disclaimers).
- **Chat conversacional (2026-08-24):** margens no painel; avatar Ava maior nas bolhas; avatar do usuário à direita (OAuth); balão de pensamento com frases rotativas; contexto inclui `exam_result_items` (marcadores com histórico).
- **Aceleradores "Pergunte à Ava"** (roadmap `ava-accelerators`, **G1 done 2026-08-25**): `AvaAcceleratorButton` em exames, pedidos e marcadores; evento `aiyracare:ava-open`; API `entityPin` → **REGISTRO EM FOCO**. Ver `docs/AVA_OPERATIONAL.md`.
- **Expressões visuais + linha narrativa:** catálogo em `docs/AVA_EXPRESSIONS.md`; `AvaAvatar` com overlays; primeiro nome do cuidador no prompt e UI.
- **Próximo:** gráficos inline no chat (`ava-charts-in-chat`, blocos ```chart renderizados com recharts).

## Sessões e conversas

### Modelo (planejado — migration `042+`)

| Tabela | Função |
|--------|--------|
| `ava_conversations` | Sessão: `account_id`, título, `status`, `last_activity_at`, LGPD |
| `ava_messages` | Turnos `user` / `assistant`, provider, tokens, metadata reflexão |
| `ava_session_context` | Pins: `entity_type`, `entity_id`, `patient_id?`, `source`, `active` |

`llm_usage_events.conversation_id` passa a referenciar `ava_conversations.id`.

### Retomar onde parou

- Lista de conversas no dock / drawer global.
- Ao abrir: últimas mensagens + pins ativos + prontuário **só** das entidades pinadas (compactação).

### Múltiplas sessões

Exemplos: “Febre hoje”, “Consulta 20/03”, “Check-up Jenifer”, “Alergia na família” — conversas distintas ou mesma conversa com pins distintos (decisão UX na implementação).

## Painel de contexto (transparência)

Barra lateral ou marcadores no composer:

```text
Pacientes: Luís, Bruno, Jenifer
Exames: X, Y, Z
Acompanhamentos: Check-up anual (Jenifer), Investigação alergia familiar
```

- Fonte de verdade do prompt: **pins PG** (`ava_session_context`).
- Neo4j **enriquece**: relações entre pins (“exame Z no thread de alergia”).
- Clicar entidade → navegação no app (exame, thread, paciente).

Ver `docs/ARCHITECTURE_DATA_LAYERS.md`.

## Troca de paciente / tema na sessão

- Permitido mudar foco na mesma conversa.
- **Hooks** (não só reativo a erro):
  - Ao selecionar outro paciente: “Continuar incluindo Luís?”
  - Inatividade (30–60 min): “Ainda sobre estes exames?”
  - Após N mensagens sobre outro filho: sugerir remover pins antigos.
- Remover pin = sai do prompt futuro; mensagens antigas permanecem no PG (LGPD).

Eventos de produto: `context_pin_added`, `context_pin_removed`, `patient_switch_hook_accepted` — ver `docs/OBSERVABILITY.md`.

## Compactação de contexto

Gerenciada pela **plataforma**:

| Camada | Regra |
|--------|--------|
| Pins | Só `active=true` no prompt |
| Histórico chat | Últimos K turnos verbatim; resumo rolling opcional citando pins |
| Prontuário | Slice por pin, não dump de 3 prontuários completos |
| Neo4j | Metadados de relação para UI; não substituir texto clínico no prompt sem pin |

## LLM e provedores

Cascata atual: Zen (opt-in sharing) → OpenCode Go → Gemini → Groq → fallback.  
Ver `docs/LLM_USAGE.md`.

Opt-ins **distintos**:

1. **Zen free** — compartilhar com provedor OpenCode (`allowLlmDataSharing` no chat).
2. **Aprimorar AiyraCare** — analytics semântico interno (futuro; ver roadmap `product-analytics-optin`).

## Higienização de prontuário

Duplicatas de sync inflam contexto e confundem Ava.  
Modelo **Google Photos**: na inserção, varredura semanal, prompt no login.  
Detalhes: `docs/DATA_HYGIENE.md`.

## LGPD

- Conversas = dado sensível (saúde + menores).
- Retenção definida em política de privacidade (prazo ou até exclusão).
- Inclusão em export de conta e `DELETE /auth/account` (cascade).
- Analytics com conteúdo: **somente opt-in**; default = métricas agregadas sem texto.

## Moonshot (fases)

| Horizonte | Entrega |
|-----------|---------|
| **Agora–6m** | Conversas, pins, higienização, observabilidade, export consulta |
| **6–18m** | Briefing médico estruturado, grafo no export, analytics opt-in |
| **18m+** | Portabilidade operadora (B2B), perfil paciente autônomo, módulos supervisionados |

## Estado atual do código (2026-08-18)

| Capacidade | Status |
|------------|--------|
| Chat Ava por paciente | ✅ |
| Cascata LLM + reflexão | ✅ |
| Metering `llm_usage_*` | ✅ |
| `conversation_id` em eventos | Coluna existe, **não preenchida** |
| Histórico persistido | ❌ planejado |
| Pins / painel contexto | ❌ planejado |
| Neo4j sessão Ava | ❌ planejado |

## APIs planejadas (resumo)

```http
GET  /ava/conversations
POST /ava/conversations
GET  /ava/conversations/:id/messages
POST /ava/conversations/:id/chat        # ou POST /ava/chat + conversationId
GET  /ava/conversations/:id/context     # pins + expansão grafo opcional
PATCH /ava/conversations/:id/context    # pin / unpin
```

## Roadmap

Épicos `ava-companion-platform`, `ava-context-transparency`, `data-hygiene-dedup` em `docs/roadmap.json`.
