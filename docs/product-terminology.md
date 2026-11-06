# Terminologia de produto (B2C — cuidador familiar)

> **Última atualização:** 2026-11-06  
> Relacionado: [`FAMILY_ACCESS_MODEL.md`](./FAMILY_ACCESS_MODEL.md), [`AVA_PATIENT_LENS.md`](./AVA_PATIENT_LENS.md), [`product/REBRAND_STATUS.md`](./product/REBRAND_STATUS.md)

## Marca (Phase 1)

| Camada | Nome | Não confundir com |
|--------|------|-------------------|
| Plataforma (UI, legal user-facing, help) | **Ananeri** | Razão social / `LEGAL_*` env (beta placeholder) |
| Agente (chat, dock, FAB) | **Neri** | Pasta/código `ava/*`, chaves i18n `ava.*`, rotas `/ava/*`, feature id `ava_companion` |
| Monorepo / npm | Raiz **`ananeri`**, workspaces `@ananeri/*` | Distinto da marca **Ananeri** na UI; repositório/pasta local podem ainda ser `aiyra-care` |

Documentação de engenharia pode manter prefixo **`AVA_`** nos nomes de arquivo (`AVA_OPERATIONAL.md`) enquanto a copy descreve **Neri**.

## Princípio

No app **B2C**, o usuário é um **cuidador familiar**, não um profissional de saúde. A interface fala de **pessoas**, **perfis de saúde** e **família** — não de «paciente» como rótulo de tela, exceto onde o contexto é claramente clínico ou exportação para consulta.

**Não alterar** por este glossário: rotas (`/patients/:id`), tipos `Patient`, schema Postgres, docs de engenharia, roadmap B2B.

## Tabela canônica (UI)

| Conceito | PT (UI) | EN (UI) | Evitar no B2C |
|----------|---------|---------|----------------|
| Home logado | Início | Home | Dashboard (nav já usa Início) |
| Lista familiar | Sua família | Your family | Meus pacientes |
| CTA adicionar | Adicionar pessoa / Adicionar à família | Add person / Add to family | Novo paciente, Cadastrar paciente |
| Perfil (rota) | Nome no cabeçalho ou «Perfil de {nome}» | — | «Paciente» como título de página |
| Lente / card Hoje | Quem ver hoje | Who to view today | Paciente (como label) |
| Titular | Você (com moderação) | You | «eu» em dropdown |
| Agregado de saúde | Histórico / Carteira | Wallet / Records | Prontuário (exceto export clínico) |
| Aba growth | Registros | Records | Medidas (sozinho como título de área) |
| Captura rápida | Registro rápido | Quick log | — |
| Onboarding dependentes | Quem você acompanha | Who you care for | Paciente |
| Export para médico | Exportar para consulta | Clinical export | Termos clínicos OK no PDF/export |

## Quando usar linguagem clínica

- **Exportação clínica / «Levar na consulta»:** pode citar prontuário, histórico consolidado, responsável — o destinatário é o profissional.
- **Neri (aceleradores):** priorizar «histórico de saúde», «registros», «consulta»; evitar «prontuário» em frases curtas da UI.
- **Higienização / duplicatas:** «registros» e «histórico»; botão de navegação → «Abrir perfil».
- **Ops / observabilidade:** terminologia técnica inalterada.

## B2C vs B2B

| | B2C (este doc) | B2B (futuro) |
|--|----------------|--------------|
| Pessoa | Perfil de saúde, familiar | Paciente, beneficiário |
| Lista | Sua família | Carteira, painel clínico |
| Público | Cuidador | Equipe, consultório |

## Exemplos

- **Bom:** «Quem ver hoje» no card Hoje; «Perfil adicionado à família» após cadastro.
- **Bom:** «Selecione a pessoa» na página Integrações.
- **Evitar:** «Paciente cadastrado com sucesso», «Selecione o paciente» em fluxos familiares.
- **OK em export:** «Não substitui prontuário oficial do serviço de saúde» no rodapé do PDF.

## Implementação

- Chaves i18n: `packages/web/src/i18n/locales/pt-BR.json` e `en.json` (MVP; `es` planejado — ver [`I18N_LOCALES.md`](./I18N_LOCALES.md)).
- Código e API mantêm `patient` como identificador técnico.
- Revisão contínua: `npm run i18n:check`.
