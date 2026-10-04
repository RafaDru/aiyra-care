# Command Hub — URL canônica (dev)

**Não use** `http://localhost:5173/ops` (legado) nem só `http://127.0.0.1:3013` sem query (abre última aba salva — muitas vezes UI antiga).

| Destino | URL |
|---------|-----|
| **Incidentes** | http://127.0.0.1:3013/?group=operacao&tab=incidentes |
| **Defeitos** | http://127.0.0.1:3013/?group=operacao&tab=defeitos |
| **Visão geral** | http://127.0.0.1:3013/?group=operacao&tab=overview |

Preview: troque porta para `:3023`.

O processo `:3013` deve ser o **ops-console** com navegação CH v2 (grupos laterais). Se aparecer só abas horizontais «Issues / Suporte», o checkout ou build está na UI antiga — use branch `cursor/ch-incidentes-board-193e` ou `main` após merge do #74.

App web (Configurações → Ops): abre `:3013` via `openOpsConsole()` — favorito o link de **Defeitos** acima.

## Notebook com worktree `aiyra-care-ch-shell`

No dev atual, o **CH v2** (Incidentes / Defeitos) pode estar só no worktree **`aiyra-care-ch-shell`** (`cursor/ch-incidentes-board-193e`). O `scripts/up.ps1` do repo **principal** sobe o ops-console **legado** (abas horizontais, sem Defeitos) e **substitui** o processo na porta **3013**.

Depois de `up.ps1` no `aiyra-care` principal:

```powershell
C:\Users\rafae\Workspace\aiyra-care-ch-shell\scripts\ops-console-up.ps1
```

Abra de novo: `http://127.0.0.1:3013/?group=operacao&tab=defeitos`.

Até merge do #74 / `ch-incidentes-board` no `main`, trate o **ch-shell** como fonte do CH v2 em `:3013`.
