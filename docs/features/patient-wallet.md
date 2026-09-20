# Carteira — planos e sync silencioso

| Campo | Valor |
|-------|--------|
| **ID** | `patient-wallet` |
| **Épico** | `connect-silencioso` |
| **Status** | `done` |
| **Categoria** | negócio |
| **Prioridade** | P0 |

## Resumo

Aba **Carteira** no perfil do paciente: CNS, carteirinhas de convênio, bloco **Hoje** e atualização **silenciosa** dos portais quando há sessão válida (`sessionReady`), sem modal obrigatório.

## Comportamento (usuário)

1. Abre perfil → aba **Carteira** (`?section=plan&tab=wallet`)
2. Vê cartões do sistema público e planos vinculados em Integrações
3. Com sessão válida e dados antigos (>6h padrão), o app dispara sync em segundo plano
4. Banner de aviso quando sync falhou, dados desatualizados ou falta primeira sessão; tag **Pode estar desatualizado** na carteirinha quando aplicável
5. Primeiro login no portal continua via **Sincronizar** em Integrações

## Superfície técnica

| Tipo | Referência |
|------|------------|
| UI | `WalletCardsTab.tsx`, `wallet-sync-banner.ts`, `useSilentWalletSync.ts` |
| Lógica stale | `silent-sync.ts` (`SILENT_SYNC_STALE_MS`, `shouldOfferSilentSync`) |
| Status por link | `useWalletLinkSyncStatus.ts` |

## QA

- Suite: [`patient-wallet`](../testing/suites/patient-wallet.md)
- Comando: `npm run qa:run -- --suite patient-wallet`
