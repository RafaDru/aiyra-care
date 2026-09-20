# Relatórios ops gerados

Arquivos `business-weekly-YYYY-MM-DD.md` são produzidos por:

```powershell
npm run ops:business-weekly
```

Requer `DATABASE_URL`. Opcional: `OPS_WEEKLY_REPORT_WEBHOOK_URL` (Slack-compatible).

**Agendamento:** loop no connect-worker (`OPS_BUSINESS_WEEKLY_INTERVAL_MS`), cron com `npm run ops-business-weekly:once` em `packages/connect-worker`, ou Cloud Run Job `CONNECT_WORKER_JOB_MODE=business-weekly`. Ver [`../README.md`](../README.md#relatório-semanal-de-negócio-agendamento).
