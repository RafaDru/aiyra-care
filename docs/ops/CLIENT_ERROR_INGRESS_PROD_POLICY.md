# Client error ingress — política preview / produção

**Status:** spec política (2026-10-06) · **Trilha global (§8.1): decisão 1A** — piloto agressivo (Rafael 2026-10-06)  
**Épico:** `client-error-universal-ingress` (fases 0–4 em `main` pós [#115](https://github.com/RafaDru/aiyra-care/pull/115))  
**Implementação:** `client-error-incident-bridge.config.ts` · `ClientErrorIncidentBridgeService` · mig **078**  
**Bridge técnico:** [`CLIENT_ERROR_INCIDENT_BRIDGE.md`](./CLIENT_ERROR_INCIDENT_BRIDGE.md) · manutenção [`OPS_PLANNED_MAINTENANCE.md`](./OPS_PLANNED_MAINTENANCE.md)

---

## 1. Objetivo

Definir como ligar o bridge `client_errors` → `INC-*` em **preview** e **produção** sem inundar o operador solo, usando:

- `CLIENT_ERROR_INCIDENT_MIN_COUNT` — ocorrências antes de abrir INC (implementado via `tryAcquireEnqueueSlot`)
- `CLIENT_ERROR_INCIDENT_DEDUPE_MS` — janela por `fingerprint × deployment_tier`
- `CLIENT_ERROR_INCIDENT_FEATURES` — allowlist por fase
- `CLIENT_ERROR_INCIDENT_SRE_FEATURES` — desvio para lane `sre_support` (ex. `integration_links`)

**Princípio charter:** ruído = custo de atenção humano zero → preferir atrasar INC a criar fila falsa.

---

## 2. Knobs (referência)

| Variável | Default código | Função |
|----------|----------------|--------|
| `CLIENT_ERROR_INCIDENT_BRIDGE_ENABLED` | `0` | Master switch |
| `CLIENT_ERROR_INCIDENT_MIN_COUNT` | `1` | Contagem na janela dedupe antes de enqueue |
| `CLIENT_ERROR_INCIDENT_DEDUPE_MS` | `900000` (15 min) | Janela dedupe / contagem |
| `CLIENT_ERROR_INCIDENT_FEATURES` | phase 0–4 set em config | Allowlist |
| `CLIENT_ERROR_INCIDENT_SRE_FEATURES` | vazio | Subconjunto → lane SRE |
| `OPS_PLANNED_MAINTENANCE` | `0` | Suprime enqueue independente do bridge |

`deployment_tier` vem de `DEPLOYMENT_TIER` / ambiente API — dedupe **não** cruza preview ↔ prod.

---

## 3. Lane SRE

| Feature típica | Lane default | Com `CLIENT_ERROR_INCIDENT_SRE_FEATURES=integration_links` |
|----------------|--------------|---------------------------------------------------------------|
| UI / patient tabs | `development_support` | — |
| `integration_links` (sync 5xx / client) | `development_support` | **`sre_support`** → automation triador SRE |

**Política:** só promover `integration_links` à lane SRE em produção quando runbook SRE e triagem batch estiverem validados — caso contrário manter em `development_support` com `MIN_COUNT` mais alto.

---

## 4. Opções de política (escolha operador)

### Opção A — «Piloto agressivo» (notebook / integração)

| | Valor |
|---|--------|
| `BRIDGE_ENABLED` | `1` |
| `MIN_COUNT` | `1` |
| `DEDUPE_MS` | `900000` (15 min) |
| Features | defaults completos fase 0–4 |
| SRE features | vazio |

**Prós:** feedback rápido; valida triagem e DEF. **Contras:** ruído em deploys — usar `OPS_PLANNED_MAINTENANCE=1`.

### Opção B — «Preview espelho» (recomendada antes de prod)

| | Preview (`:3020` / tier preview) | Prod |
|---|-----------------------------------|------|
| `BRIDGE_ENABLED` | `1` após suite `client-error-ch-bridge` PASS | `0` até B validado 7d |
| `MIN_COUNT` | `2` | `3–5` |
| `DEDUPE_MS` | `3600000` (1 h) | `21600000` (6 h) |
| Features | subset fase 1 (`patient_*`, `ui`) | + fase 3–4 gradual |
| SRE | `integration_links` em preview só | prod após piloto |

**Prós:** detecta regressão real sem spam; alinha com solo operator. **Contras:** INC atrasado vs Opção A.

### Opção C — «Prod conservador + SRE split»

| | Prod |
|---|------|
| `BRIDGE_ENABLED` | `1` |
| `MIN_COUNT` | `5` |
| `DEDUPE_MS` | `21600000`–`43200000` (6–12 h) |
| Features | fase 1–2 apenas; **excluir** `ava_companion` até review médico na triagem |
| `SRE_FEATURES` | `integration_links` |
| Ava | ingest only até decisão explícita charter |

**Prós:** mínimo ruído; sync falho vai para SRE. **Contras:** erros únicos de UI podem nunca atingir `MIN_COUNT`.

---

## 5. Trilha adotada (decisão §8.1 — **1A**, Rafael 2026-10-06)

**Opção A — piloto agressivo** como trilha global até revisão explícita (substitui recomendação solo B da redação inicial):

1. **Notebook e preview:** `BRIDGE_ENABLED=1`, `MIN_COUNT=1`, `DEDUPE_MS=900000` (15 min), features fase 0–4 (defaults config), `SRE_FEATURES` vazio — ver `.env.example`.
2. **Deploy / restart:** `OPS_PLANNED_MAINTENANCE=1` durante migração; validar com `npm run qa:run -- --suite client-error-ch-bridge` e `ops-planned-maintenance`.
3. **Prod:** seguir mesma trilha 1A ao ligar o bridge (INC rápido, mais triagem humana/automation); ruído mitigado por triagem e manutenção — **não** adiar com perfil B/C salvo nova decisão §8.
4. **Itens §8.2–8.8** permanecem com defaults solo operator até Rafael responder — allowlist prod, Ava, lane SRE, G3, etc.

Decisão estratégica pendente (§8.2): allowlist «todas as features» vs faseada em prod — não bloquear env 1A no notebook/preview.

---

## 6. Rollout por ambiente (tabela executável)

| Ambiente | `BRIDGE` | `MIN_COUNT` | `DEDUPE_MS` | Features (inicial) | SRE |
|----------|----------|-------------|-------------|-------------------|-----|
| Notebook | `1` | `1` | 15 min | 0–4 | — |
| Preview | `1` (1A) | `1` | 15 min | 0–4 | — |
| Prod | `1` quando ligar (1A) | `1` | 15 min | 0–4 | §8.4 pendente |

*Opções B/C na §4 permanecem referência se a trilha for revisada.*

Sempre: `OPS_PLANNED_MAINTENANCE=1` durante migração/restart.

---

## 7. Observabilidade e QA

| Artefato | Uso |
|----------|-----|
| CH **Produto & UX** | fingerprints quentes antes de baixar `MIN_COUNT` |
| Suite `client-error-ch-bridge` | regressão bridge + manutenção |
| `npm run test:ops` | `client-error-incident-bridge.service.test.ts` (`minCount`, dedupe) |
| Métricas C8 (#114) | tempo INC→DEF — validar política não paralisa ciclo |

---

## 8. Decisões para Rafael (uma por vez)

Responder **um número por mensagem**; agentes aplicam env e docs após cada resposta.

### 1. Trilha global do bridge (preview → prod)

Telemetria de erro de cliente já cobre fases 0–4 no código; falta fixar o quanto de ruído INC é aceitável antes de ligar produção.
Opção A: piloto agressivo (INC rápido, mais triagem). Opção B: preview espelho depois prod gradual (recomendada na redação inicial §4). Opção C: prod conservador com lane SRE para integrações.
**Default solo operator (spec):** B. **Decidido (Rafael 2026-10-06):** **1A** — Opção A; env e §5–§6 atualizados.

### 2. Allowlist de features em produção (primeiro corte)

Ao ligar o bridge em prod, a allowlist pode ser só abas paciente e shell ou já incluir integrações e Ava.
Opção A: fases 0–2 apenas (UI + patient tabs). Opção B: incluir integration_links sem Ava. Opção C: paridade completa 0–4 incluindo Ava companion.
**Default solo operator:** A, depois B após uma semana de preview estável.

### 3. Ava companion em prod (ingress)

Erros na borda Ava podem gerar INC com implicação de revisão clínica na triagem.
Opção A: ingest sem bridge (só telemetria). Opção B: bridge com MIN_COUNT alto e dedupe longo. Opção C: bridge normal igual às outras features.
**Default solo operator:** A até decisão médica explícita; depois B.

### 4. Lane SRE para integration_links

Falhas de sync podem ir para triagem dev ou triagem SRE.
Opção A: sempre development_support. Opção B: SRE só em prod, dev em preview. Opção C: SRE em preview e prod quando bridge ligado.
**Default solo operator:** A no notebook; B quando prod ligar integration_links no bridge.

### 5. G3 agêntico automático após review (CH_G3_AGENTIC_AUTO_APPROVE)

Define se a automation de review deve chamar aprovação G3 no CH sem um segundo agente.
Opção A: desligado — agente de entrega chama G3 após QA. Opção B: ligado só quando recomendação approve e CI verde. Opção C: ligado em todo approve da review, CI à parte.
**Default solo operator:** B (reduz passos sem pular CI).

### 6. Gate G3 exige review approve (CH_G3_REQUIRE_REVIEW_APPROVE)

Complementa o item 5: endurecer API para bloquear G3 sem review ou override auditado.
Opção A: desligado no notebook, ligado em prod. Opção B: ligado em todos os ambientes. Opção C: desligado sempre (só política do agente).
**Default solo operator:** A.

### 7. Manutenção v2 — suprimir dispatch de ops_alert

Na v2 de manutenção planejada, alertas ops ainda podem abrir INC durante deploy.
Opção A: não suprimir (comportamento v1). Opção B: suprimir só alertas marcados sensíveis a manutenção. Opção C: suprimir todo auto-INC originado de ops_alert na janela.
**Default solo operator:** B.

### 8. Momento de exigir CI verde para disparar review (CH_PR_REVIEW_REQUIRE_CI_GREEN)

O gate impede request-review enquanto pipeline do defeito não está em sucesso.
Opção A: ligar no notebook assim que webhook defect-ci ou poll estiver estável. Opção B: ligar só após piloto C9 e suite ops-ch-cycle-close PASS. Opção C: manter desligado; agentes e merge seguem política própria.
**Default solo operator:** B no curto prazo; A após webhook CI confiável por 7 dias.

---

## 9. Critérios de aceite (spec)

1. Três opções documentadas com prós/contras; trilha **1A** registrada (§5–§6).
2. `MIN_COUNT` tratado como **implementado** (não backlog).
3. Cross-link em gap doc, bridge doc, `HISTORICO.md`.
4. Fila §8 «Decisões para Rafael» com defaults solo operator.
5. Nenhuma mudança obrigatória de código nesta entrega — só env em deploy quando Rafael/policy agente aprovar trilha.
