# Command Hub — URL canônica (dev)

**Não use** `http://localhost:5173/ops` (legado) nem só `http://127.0.0.1:3013` sem query (abre última aba salva — muitas vezes UI antiga).

| Destino | URL |
|---------|-----|
| **Incidentes** | http://127.0.0.1:3013/?group=operacao&tab=incidentes |
| **Defeitos** | http://127.0.0.1:3013/?group=operacao&tab=defeitos |
| **Visão geral** | http://127.0.0.1:3013/?group=operacao&tab=overview |

Preview: troque porta para `:3023`.

O processo `:3013` deve ser o **ops-console** com navegação CH v2 (grupos laterais). Confirme `layoutVersion: ch-shell-v2` em `GET http://127.0.0.1:3013/health`. Se aparecer só abas horizontais «Issues / Suporte», o checkout ou build está na UI antiga.

App web (Configurações → Ops): abre `:3013` via `openOpsConsole()` — favorito o link de **Defeitos** acima.

## Worktree opcional `aiyra-care-ch-shell`

Par irmão do repo principal (ou `AIYRA_CH_SHELL_ROOT`). O `scripts/up.ps1` **prefere** subir o ops-console a partir do ch-shell **somente** quando o HEAD do worktree está **alinhado** com o checkout principal:

| Situação | Comportamento do `up.ps1` |
|----------|---------------------------|
| Mesmo SHA nos dois checkouts | Ops-console via ch-shell |
| ch-shell **à frente** de `main` (commits só no shell) | Ops-console via ch-shell |
| ch-shell **atrás** ou **divergente** | Ops-console do **checkout principal** + aviso amarelo com SHAs |
| `AIYRA_OPS_CONSOLE_FROM_MAIN=1` | Sempre checkout principal (ignora ch-shell) |

Isso evita servir CH antigo em `:3013` quando o worktree ficou parado sem merge/rebase.

### Ritual de normalização (notebook)

1. **Um SHA** — alinhe os dois checkouts ao mesmo commit (recomendado: `main` atual):

   ```powershell
   cd C:\Users\rafae\Workspace\aiyra-care
   git fetch origin main
   git checkout main
   git pull origin main

   cd ..\aiyra-care-ch-shell
   git fetch origin main
   git checkout main
   git reset --hard origin/main   # ou merge/rebase se estiver em branch de feature
   ```

2. **Subir de novo** — `scripts\up.ps1` no repo principal (ou `AIYRA_OPS_CONSOLE_FROM_MAIN=1` se quiser forçar só o principal).

3. **Validar** — `curl -s http://127.0.0.1:3013/health` → `layoutVersion: ch-shell-v2`; abra `/?group=operacao&tab=defeitos`.

4. **Sem drift silencioso** — se o aviso `[CH] ch-shell ATRÁS` ou `DIVERGENTE` aparecer, não ignore: normalize o SHA ou use `AIYRA_OPS_CONSOLE_FROM_MAIN=1` até alinhar.

Subir só o console (sem stack completa):

```powershell
.\scripts\ops-console-up.ps1
# ou, com ch-shell alinhado, o up.ps1 já escolhe o script certo
```
