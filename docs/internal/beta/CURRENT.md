# Beta preview — lote atual

Espelho no repo do Project store `internal/beta/` (SHA, URL, o que testar). Atualizar junto com [`../infra/preview-deploy-status.json`](../infra/preview-deploy-status.json). **Não** promover daqui.

| Campo | Valor |
|-------|--------|
| **Checagem** | 2026-11-23 |
| **Preview SHA** | `f8659fa` (`f8659faf784c862da65565762ca5dfd5a6d521fc`) |
| **`main` SHA** | `f8659fa` (alinhado) |
| **Promote** | **OK** — lote #234–#236 |
| **Último Promote** | 2026-11-23T19:37:36Z · [Actions run 45250015448](https://github.com/RafaDru/aiyra-care/actions/runs/45250015448) |
| **Web** | https://ananeri-preview-web-kzp5ynymva-uc.a.run.app |
| **API** | https://ananeri-preview-api-kzp5ynymva-uc.a.run.app |

## O que a beta testa agora (preview)

- AC-136: shell PWA compacta com **aba Neri central** + polish mobile.
- **Registro rápido**: título de acompanhamento, nota → continua em sinais vitais (lote #235).
- Ícones PWA light (AC-126 / lote).
- **Jenifer:** remover e reinstalar o atalho PWA no celular após este promote.

## Próximo lote

Novos merges em `main` acumulam até Rafael pedir ou fechamento de wave — ver [`../infra/PREVIEW_DEPLOY_LOT.md`](../infra/PREVIEW_DEPLOY_LOT.md).