# Suite QA — CH pacote UX / gráfico

**Id:** `ops-ch-ui-graphics`  
**Lane:** ops (manual CH)  
**Spec:** [`docs/ops/CH_UI_GRAPHICS_PACKAGE.md`](../../ops/CH_UI_GRAPHICS_PACKAGE.md)

## Pré-requisitos

- ops-console `:3013` com migrações CH atuais
- Pelo menos 1 INC em «Em aberto» e 1 DEF `ready_for_pr` com `latestReview` (piloto ou seed)

## Passos

1. **Layout** — lista longa em Incidentes: rolar conteúdo; sidenav do grupo Operação permanece visível (desktop)
2. **Filtro** — abrir Incidentes/Defeitos sem query: chip **Em aberto** ativo; nenhuma linha com highlight amarelo
3. **Tags na linha** — copiar `INC-*` / `DEF-*` pelo controle na linha **sem** expandir
4. **Expand** — clique na linha (fora de botões) expande/colapsa detalhe
5. **Detalhe** — seções visuais (resumo, vínculos, técnico); não bloco único de texto
6. **Confirmação** — «Corrigido», «Iniciar correção», «Aprovar para merge», «Pedir mudanças»: modal antes do POST
7. **SSE Incidentes** — indicador ao vivo; alterar status via callback/API: linha atualiza sem F5 e sem botão Atualizar
8. **SSE Defeitos** — `request-review` ou callback mock: card e badge na linha atualizam sem poll manual
9. **Review na lista** — DEF `ready_for_pr` mostra chip `approve` / `request_changes` na linha
10. **CH Geral** — tooltip «Verificar e acionar» menciona checagem de alertas / dispatch SRE (não triagem INC)

## Critério

PASS se G1–G8 do spec §11 satisfeitos no notebook (passos 1–10).
