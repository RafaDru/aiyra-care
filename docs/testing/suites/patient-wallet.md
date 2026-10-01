# Suite — `patient-wallet`

| Campo | Valor |
|-------|--------|
| **ID** | `patient-wallet` |
| **Domínio** | `perfil-carteira` |
| **Lane** | `business-full` |
| **Fixture** | `core-demo` (links demo opcionais) |
| **parallelSafe** | `true` |
| **Automação** | `partial` |

## Escopo

Smoke da aba **Carteira** — visualizar cartões/planos e presença do sync silencioso **sem** login real em portal externo.

Fora de escopo: validar QR Unimed, WAF Amil/Unimed, import ConecteSUS guiado.

## Pré-requisitos

- [ ] API e web em execução (`:3010` / `:5173`)
- [ ] Conta QA E2E com compliance aceito
- [ ] (Opcional) Paciente demo com links em `integration_links` para ver carteirinhas preenchidas

## Passos

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Abrir perfil de paciente (`QA-*` ou demo) | Página do paciente carrega | |
| 2 | Clicar aba **Carteira** | URL `tab=wallet`; painel da carteira visível | |
| 3 | Verificar cabeçalho «Carteira de …» | Título + subtítulo de credenciais | |
| 4 | Verificar bloco **Sistema público** | Card CNS (ativo ou pendente) | |
| 5 | Verificar bloco **Plano de saúde** | Empty «vincule em Integrações» **ou** grid de carteirinhas | |
| 6 | Verificar bloco **Hoje** (`walletToday`) | Painel «Hoje» visível (ver `family-day-timeline`) | |
| 7 | (Com link demo + `sessionReady`) Abrir Carteira novamente | Sem modal de sync; status «Atualizado» ou spinner breve — silent sync dispara | |
| 8 | Sem sessão válida | Empty ou hint «Sincronize em Integrações na primeira vez» — **sem** erro de portal | |
| 9 | (Opcional) Link com `sessionReady` e `lastSyncAt` >6h | Banner `[data-testid=wallet-sync-banner]` **ou** tag «Pode estar desatualizado» na carteirinha; banner stale some enquanto spinner «Sincronizando» ativo | |
| 10 | Link sem `sessionReady` (primeira vez) | Banner com CTA `[data-testid=wallet-sync-banner-cta]` → aba Integrações do paciente | |

## Pós-condições / cleanup

- Nenhum dado criado (somente leitura).
- Se usou paciente `QA-*` criado no teste, excluir no dashboard.

## Seletores (automação)

| Elemento | Seletor sugerido |
|----------|------------------|
| Aba Carteira | `getByRole('tab', { name: 'Carteira' })` |
| Painel Hoje | `.wallet-today-panel` |
| Card CNS | `#wallet-card-conectesus` |
| Empty planos | texto `Nenhuma carteirinha` |
| Grid carteirinhas | `[id^="wallet-card-"]` (exceto conectesus/caderneta) |
| Banner sync | `[data-testid="wallet-sync-banner"]` |
| CTA Integrações | `[data-testid="wallet-sync-banner-cta"]` |
| Tag stale (cartão) | `[data-testid="wallet-card-stale-hint"]` |

## Notas

- Silent sync: `useSilentWalletSync` — só com `sessionReady`; API ignora `silent=1` sem sessão.
- Banner de aviso (stale/failed) é aceitável; falha de portal **não** deve bloquear a aba.
- Complementa `family-day-timeline` (bloco Hoje) e `integrations-link-sync` (sync manual com modal).
