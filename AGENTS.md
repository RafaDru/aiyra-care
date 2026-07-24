# Project Instructions for OpenCode

## Starting Services
When user says "up", "sobe", "sobe os serviços", or "restart", run:
```
taskkill /F /IM node.exe 2>&1 | Out-Null
Start-Sleep 2
powershell -File "C:\Users\rafae\Documents\Filhos\scripts\up.ps1" *>$null
```
Always use `*>$null` to suppress output so the chat doesn't get stuck.

## API & Web
- API: http://localhost:3000/health
- Web: http://localhost:5173
- Logs: api.log and web.log in project root
