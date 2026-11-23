# Beta preview — lote atual

Espelho no repo do Project store `internal/beta/` (SHA, URL, o que testar). Atualizar junto com [`../infra/preview-deploy-status.json`](../infra/preview-deploy-status.json). **Não** promover daqui.

| Campo | Valor |
|-------|--------|
| **Checagem** | 2026-11-23 |
| **Preview SHA** | `828eb3b` (`828eb3bdc8bdfc203b84ec62c94097db404adf39`) |
| **`main` SHA** | `63fb1b3` (`63fb1b3aa0cbc4702f820673124da64736f39e4b`) |
| **Promote** | **Pendente** no lote (`828eb3b` ≠ `63fb1b3`) |
| **Último Promote** | 2026-11-23T17:40:02Z · [Actions run #21](https://github.com/RafaDru/aiyra-care/actions/runs/45229326123) |
| **Web** | https://ananeri-preview-web-kzp5ynymva-uc.a.run.app |
| **API** | https://ananeri-preview-api-kzp5ynymva-uc.a.run.app |

## O que a beta testa agora (preview)

- AC-126: ícone PWA **light** + shell mobile v1 (instalação / standalone).
- Não inclui ainda: aba Neri central compacta (#232 / AC-136).

## O que espera Promote (já em `main` ou PRs do lote)

| Item | Estado |
|------|--------|
| #232 AC-136 polish PWA + Neri tab | em `main` `63fb1b3`, **não** no Cloud Run |
| #235 registro rápido (título + nota → vitais) | PR aberta |
| #234 spec PWA shell | PR aberta |
| #236 política promote por lote | PR aberta |

Merge + CI em `main` pode continuar. Promote: Actions → **Promote to Preview** · `ref=main` · `deploy_gcp=true` — só no fechamento de lote ou pedido Rafael.
