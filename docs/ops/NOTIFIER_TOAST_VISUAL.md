# Notificador — linguagem visual (bandeja Windows)

> Implementacao: `scripts/ops-notifier-toast-design.ps1`, `ops-toast-resolve.ps1`, `ops-alert-toast.ts`, `support-report-dispatch.ts`

Tres familias de toast no mesmo receptor HTTP (`/ops-alert`) + acoes locais do farol.

## Matriz visual

| Familia | Tag no titulo | Glyph no corpo | Icone balloon | Abre browser | Origem |
|---------|---------------|----------------|---------------|--------------|--------|
| **Ambiente** | `Ambiente \|` | `[!]` | Error (critico) / Warning (aviso) | Sim | `ops:alerts-check`, thresholds, probe |
| **Suporte** | `Suporte \|` | `[?]` | Info | Sim (`?tab=support`) | Reportar problema, `support_reports` |
| **Farol** | `Farol \|` | `[>]` | Info / Warning (falha) | Nao | Menu camada (iniciar/reiniciar/log) |
| **Sistema** | `Ops \|` | `[.]` | Info | Nao | Startup tray, fila ocupada |

## Titulo (max 63 chars)

```
{Tag} | {Tier opcional} {Headline}
```

Exemplos:

- `Ambiente | CRITICO`
- `Suporte | Novo chamado`
- `Farol | Staging - Reiniciar Banco`

## Corpo (max 255 chars)

```
[{glyph}] {linha de contexto opcional}
{detalhe}
```

Exemplos:

```
[!] Infra: API fora do ar
Sync: job preso ha 35 min
```

```
[?] Bug tecnico
/patient/abc
Console - aba Suporte
```

```
[>] Banco :3020
Postgres reiniciado; backend subindo
```

## Payload JSON (webhook)

| Campo | Ambiente | Suporte |
|-------|----------|---------|
| `type` | ausente ou `ops_alert` | `support_report` |
| `toast.title` | `[Ambiente] CRITICO` (API) | `[Suporte] Novo chamado` |
| `toast.icon` | `error` / `warning` | `info` |
| `alerts[]` | sim | nao |

## Menu do tray (farol)

Dots coloridos no menu = **estado** (leitura). Submenu Iniciar/Reiniciar = **acao** (toast familia Farol).
