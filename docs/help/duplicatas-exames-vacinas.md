# Registros duplicados (exames e vacinas)

**ID:** `duplicatas-exames-vacinas`  
**Feature:** `hygiene-neo4j-candidate`

## Pergunta

Por que aparecem dois exames parecidos? O que fazer?

## Resposta

Às vezes o mesmo exame chega de portais diferentes ou em importações repetidas. O AiyraCare detecta **candidatos a duplicata** e pode avisar no login ou na higienização.

## O que você pode fazer

1. Abra o aviso de higienização quando aparecer.
2. Compare os dois registros.
3. Escolha **Mesma consulta/exame** (mantém um canônico) ou **Não é duplicata**.

Os dados ficam no seu histórico; a decisão fica registrada para não perguntar de novo.

## Relacionado

- [`docs/DATA_HYGIENE.md`](../DATA_HYGIENE.md)
- [`docs/features/hygiene-neo4j-candidates.md`](../features/hygiene-neo4j-candidates.md)
