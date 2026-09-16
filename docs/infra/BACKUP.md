# Backup e restore — PostgreSQL

> **Última atualização:** 2026-09-02  
> Épico: `platform-environments` · `env-backup-restore`

## Política (produção — quando live)

| Item | Sugestão inicial |
|------|------------------|
| Frequência | Diário full + WAL contínuo (provedor PG gerenciado) |
| Retenção | 30 dias rolling |
| Teste restore | 1×/trimestre em instância isolada |
| Staging | **Nunca** restaurar dump de prod sem anonimização |

## Local / dev

```powershell
pg_dump -h 127.0.0.1 -U postgres -d aiyracare -Fc -f aiyracare-dev.dump
pg_restore -h 127.0.0.1 -U postgres -d aiyracare_restore --clean aiyracare-dev.dump
```

## Staging refresh (sem backup prod)

Preferir massas sintéticas:

```powershell
cd packages/api
npm run seed:staging-refresh
```

## Pré-deploy prod (futuro)

1. `pg_dump` antes de migration destrutiva.
2. Tag de release + artefatos CI.
3. Rollback: redeploy tag anterior; restore só se migration irreversível.

## LGPD

Backups de produção contêm PHI — criptografia at-rest no provedor, acesso restrito, sem cópia em laptops.
