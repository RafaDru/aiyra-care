# Quem pode ver o perfil de saúde?

**ID:** `quem-pode-ver-perfil-saude`  
**Feature:** `family-access-model`

## Pergunta

Quem tem acesso aos dados de saúde do meu filho?

## Resposta

- **Titular do cadastro** (`owner_account_id`): quem criou o perfil na plataforma.
- **Cuidadores convidados**: contas com **concessão ativa** (`patient_access_grants`) — criada ao aceitar convite ou manualmente pelo titular.
- **Você mesmo**: se o perfil é marcado como **Você** (adulto cuidando de si).

No perfil de saúde, use **Quem tem acesso** para ver a lista de cuidadores. O titular pode **revogar** o acesso de um cuidador.

Ninguém fora dessas permissões acessa via app. Exportações e links de compartilhamento são ações separadas, com prazo e controle.

## LGPD

Menores: o responsável legal declara consentimento no cadastro. Em caso de dúvida sobre guarda compartilhada, consulte nosso canal de privacidade em Configurações → Legal.

## Relacionado

- [`docs/LEGAL_COMPLIANCE.md`](../LEGAL_COMPLIANCE.md)
- [`docs/FAMILY_ACCESS_MODEL.md`](../FAMILY_ACCESS_MODEL.md)
- Configurações → **Família e cuidadores** (`/settings/family`)
