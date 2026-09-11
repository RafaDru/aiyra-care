# Relatórios ops gerados

Arquivos `business-weekly-YYYY-MM-DD.md` são produzidos por:

```powershell
npm run ops:business-weekly
```

Requer `DATABASE_URL`. Opcional: `OPS_WEEKLY_REPORT_WEBHOOK_URL` (Slack-compatible).
