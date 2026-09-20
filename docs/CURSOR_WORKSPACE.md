# Cursor — workspace AiyraCare

> **Última atualização:** 2026-09-18  
> **Status:** pasta canônica única em `workspace\aiyra-care`.

## Caminho canônico

| Item | Valor |
|------|--------|
| **Abrir no Cursor** | `C:\Users\rafae\workspace\aiyra-care` |
| **GitHub** | `RafaDru/aiyra-care` |
| **npm** | `aiyra-care` (`@aiyra-care/*`) |
| **Continuar sessão** | `docs/CURSOR_SESSION_CONTINUATION.md` |

## Legado (arquivado)

| Caminho | Status |
|---------|--------|
| `Documents\Filhos` | removido — backup em `workspace\_archive\Filhos-2026-09-03` |
| `workspace\aiyra-cara` | removido (2026-09-03) |

## Projeto Cursor

| Pasta interna | Workspace |
|---------------|-----------|
| `c-Users-rafae-workspace-aiyra-care` | **usar** |

## Projects (coordenação nuvem) + agentes locais

O modo **Projects** do Cursor usa um **coordenador na nuvem** (planeja, fila, memória de longo prazo). Por padrão os *workers* rodam em VM cloud. Para executar no **checkout local** (MCP, Postgres, hooks, Playwright nesta máquina), use **My Machines** / **Remote Control**.

| Camada | Onde roda |
|--------|-----------|
| Coordenador Projects | Nuvem Cursor |
| Edição de arquivos, terminal, MCP stdio | **Este PC** (`NotebookRafael`) |
| Hooks `.cursor/hooks.json` | Carregados no worker local |

### Setup desta máquina (Windows)

1. CLI instalado: `agent --version` (instalar: `irm 'https://cursor.com/install?win32=true' | iex`).
2. Autenticação: `agent login` **ou** `CURSOR_API_KEY` pessoal (mesma conta do app).
3. Subir worker manualmente **ou** autostart no login (recomendado):

```powershell
# uma vez — tarefa agendada no logon (45s após login)
powershell -File scripts/cursor-worker-install-autostart.ps1

# manual / debug
powershell -File scripts/cursor-worker-start.ps1
```

Log do autostart: `%LOCALAPPDATA%\cursor-agent\worker-autostart.log`  
Tarefa agendada: `AiyraCare-CursorMyMachinesWorker` (remover: `scripts/cursor-worker-uninstall-autostart.ps1`).

4. No Cursor: **Projects** ou [cursor.com/agents](https://cursor.com/agents) → ambiente **My Machines** → **`NotebookRafael`**.
5. Opcional no chat/Slack/GitHub: `worker=NotebookRafael` para forçar esta máquina.

### Verificação

```powershell
cd C:\Users\rafae\workspace\aiyra-care
agent worker debug
```

Deve listar `Visibility: 1 worker` com `NotebookRafael`.

### Manutenção Windows

Após `agent update`, o worker pode falhar com `better-sqlite3` / `NODE_MODULE_VERSION`. Corrigir:

```powershell
powershell -File scripts/cursor-worker-repair.ps1
```

O modo `-Autostart` (tarefa no logon) **reinicia o worker** a cada 30s se o processo cair (comum após sessões cloud). Remove `worker.lock` obsoleto quando a nuvem mostra `0 workers`.

Diagnóstico rápido:

```powershell
agent worker debug   # deve listar Non-privacy: 1 worker
Get-Content $env:LOCALAPPDATA\cursor-agent\worker-autostart.log -Tail 15
```

Alternativa estável (se o bug voltar): worker dentro de **WSL Ubuntu** com repo em `~/workspace/aiyra-care` (não em `/mnt/c`).

### Limitações conhecidas

- Não existe hoje modo “coordenador 100% local”; só **execução** local via My Machines.
- MCP **HTTP** (OAuth) roda no backend Cursor; MCP **stdio** roda no PC (configurar em `.cursor/mcp.json` se necessário).
- Worker IDE embutido no app pode falhar no Windows; preferir o CLI `agent worker start`.
- `CURSOR_API_KEY` no ambiente pode divergir da sessão do site — usar a mesma conta em ambos.

Docs oficiais: [My Machines](https://cursor.com/docs/cloud-agent/my-machines) · [Projects](https://cursor.com/blog/projects).
