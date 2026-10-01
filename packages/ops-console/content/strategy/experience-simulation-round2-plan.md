# Plano — Simulação CX Round 2 (staging local)

> **Objetivo:** Validar hipóteses do [experience-cx-round1](./experience-cx-round1.md) com **novo usuário simulado**, evidência visual, **sem PHI** no relatório.  
> **Ambiente alvo:** Preview local — web **`:5174`**, API **`:3020`**, PG `aiyracare_preview` (`npm run up:preview` no worker local).  
> **Não substitui:** suites QA regressão (`qa:run`, `family-matrix`, `qa.e2e` power flows).

---

## TL;DR

| | |
|--|--|
| **Quem executa** | Agente CX + worker local (Playwright e/ou computerUse) |
| **Onde grava evidência** | Project store `media/cx-round2/` (PNG; blur se vazar dado) |
| **Contas** | 1× fresh onboarding + 1× convite + reutilizar `qa.e2e` **só** para smoke técnico, **não** como persona novato |
| **Saída** | Atualizar `experience-cx-round2.md` (criar após execução) com severidade **confirmada** |

---

## Pré-requisitos (worker)

```bash
npm run up:preview
npm run env:status   # API :3020, web :5174 OK
```

- Supabase de preview configurado (`.env.preview` / doc `PREVIEW_LOCAL_TEST_GUIDE`).
- `AVA_TEST_MODE=1` se tarefas incluírem Ava (respostas determinísticas; **não** julgar qualidade LLM).
- Browser: Playwright MCP ou subagent **computerUse** apontando para `http://localhost:5174`.

**Anti-PHI:** nomes tipo `CX Teste Filho`, CPF gerado (`uniqueQaCpf` / script QA), e-mails `cx.persona-*@aiyracare.local`. Nunca colar laudo, CPF real ou screenshot de produção no Project store.

---

## Contas e seeds

| Persona | Conta sugerida | Setup |
|---------|----------------|--------|
| Camila | `cx.camila@aiyracare.local` | `npm run qa:reset-onboarding-user` pattern ou script novo `cx:create-persona` (futuro); senha em vault QA local |
| Diego | Reutilizar Camila **ou** segunda conta após reset | Medir tempo até 1º `quick_capture_saved` |
| Renata | Convidada | Titular seed cria convite → link `/invite/accept` (sem matriz João/Maria) |
| Lucas | Mesma conta Camila **D+14 simulado** | Não esperar 14 dias: checklist «retorno» (relogin, achar Integrações, export) |

**Contraste explícito:** `family-matrix.json` + `qa:seed:qa-family-matrix` = **ACL power** — rodar em suite separada, **fora** deste plano CX.

Referência técnica contas: repo `docs/testing/PLAYWRIGHT_FLOWS.md`, `docs/testing/AUTH_TESTING.md`.

---

## Tarefas scriptadas (por persona)

Cada tarefa: **Given → When → Then → Evidência** (`media/cx-round2/<persona>-<step>.png`).

### Fluxo P0 comum (Camila + Diego)

| # | Tarefa | Then (sucesso novato) | Hipótese R1 |
|---|--------|------------------------|-------------|
| A1 | Landing `/home` → CTA signup | Chega em login signup sem jargão «paciente» | Copy alinhada marketing |
| A2 | Signup + compliance (se gate) | Entende o que aceita; não perde contexto | Empilhamento modal |
| A3 | Onboarding passo 1 (CPF) | Completa em &lt;3 min sem abandonar | Carga cognitiva / confiança |
| A4 | Passo 2 — adiciona **1 dependente** pediátrico | Vê dependente listado; CTA «Ir para o início» claro | Terminologia «Quem você acompanha» |
| A5 | Início — modal «Primeiros passos» | Consegue dismiss **ou** concluir sem pânico | Peak–end pós-formulário |
| A6 | Abrir perfil do filho → aba **Carteira** | Entende vazio + hint Integrações | Descoberta sync |
| A7 | **Registro rápido** — 1 nota febre | Toast sucesso; item em **Hoje** | Lente «Quem ver hoje» |
| A8 | Primeiro toque **Ava dock** | Disclaimer visível; chat abre | Confiança / não diagnóstico |

**Diego-only:** cronometrar A3+A7; anotar quantos cliques até registro salvo. Falha se &gt;5 toques ou &gt;2 modais seguidos.

### Renata (convidada)

| # | Tarefa | Then |
|---|--------|------|
| B1 | Abrir link convite (e-mail copiado ou URL staging) | Entende **quem convidou** e **quais perfis** verá |
| B2 | Aceitar + login/conta nova | Dashboard mostra **só** perfis grantados (smoke, não matriz completa) |
| B3 | Tentar Configurações → Família | Não confunde «admin» com «só cuidar» |

Evidência: `renata-invite-accept.png`, `renata-dashboard.png`.

### Lucas (retorno simulado)

| # | Tarefa | Then |
|---|--------|------|
| C1 | Logout → login | Vai para Início, **não** re-onboarding |
| C2 | Achar **Integrações** vs **Carteira** | Explica onde sincronizar (1 frase gravada na nota) |
| C3 | «Levar na consulta» ou export smoke | Encontra CTA em ≤2 min navegando |

---

## Ferramentas

| Ferramenta | Quando |
|------------|--------|
| **Playwright** (`packages/web/e2e/`) | Repetível: fork `onboarding.spec.ts` → `e2e/cx-novice-smoke.spec.ts` (opcional repo); ou MCP Playwright no worker |
| **computerUse** | Heurística Nielsen + mobile viewport 390×844; gravação opcional |
| **Telemetria** | Conferir eventos em ops `:3023` / `product_events` — IDs only, sem payload clínico |

**Viewport obrigatório:** pelo menos 1 passagem **mobile** nas tarefas A5–A8.

---

## Critérios de severidade (confirmar vs R1)

| ID hipótese R1 | Confirmado se… |
|----------------|----------------|
| H1 Empilhamento modais | compliance + Primeiros passos &lt;30s sem interação |
| H2 Hoje invisível no Início | Com 1 dependente, bloco Hoje **não** aparece no dashboard |
| H3 Sync expectativa | Usuário acredita que Carteira atualiza sozinha **sem** ir a Integrações |
| H4 Ava desabilitada no tour | Passo Ava disabled com 0 perfis após skip dependentes |
| H5 Créditos IA assustam | `quotaHint` lido como «vou pagar agora» na 1ª abertura |

Escala: **S1** bloqueia ativação · **S2** atrito forte · **S3** polish · **S4** observação.

---

## Entregáveis Round 2

1. `docs/experience-cx-round2.md` — tabela hipótese × evidência × severidade final.
2. `media/cx-round2/` — 8–15 PNG nomeados; README one-liner listando arquivos.
3. Atualizar § «Próximos passos» em [experience-cx-round1](./experience-cx-round1.md) com link.

---

## Fora de escopo Round 2

- Qualidade das respostas Ava (ver `AVA_QA_SCOPE.md`).
- Sync real Unimed/Amil (credenciais reais, Chrome CDP).
- Matriz João/Maria/Francisco/Vitória.
- Performance/load.

---

## Links

- [experience-cx-round1](./experience-cx-round1.md)
- [skills/experience-advisor](./skills/experience-advisor.md)
- [marketing-strategy-round1](./marketing-strategy-round1.md) — metas ativação
- [finance-strategy-round1](./finance-strategy-round1.md) — copy créditos/planos
- Repo: `docs/infra/PREVIEW_LOCAL_TEST_GUIDE.md`
