# Emergência — diretório e contatos

> Migration **039** · UI `/emergency` · API `/emergency/*`

## Modelo

| Tabela | Uso |
|--------|-----|
| `emergency_directory` | Canais **oficiais** (seed nacional; expandir UF/município) |
| `patient_emergency_contacts` | Contatos do paciente (pediatra, plano, família) — **soft delete** |

## Seed nacional (fontes oficiais)

| Número | Serviço | Fonte |
|--------|---------|--------|
| 192 | SAMU | [gov.br/saude — SAMU](https://www.gov.br/saude/pt-br/composicao/saes/samu-192) |
| 193 | Bombeiros | Corpo de Bombeiros |
| 190 | Polícia Militar | Emergência policial |
| 191 | PRF | Rodovias federais |
| 188 | CVV | [cvv.org.br](https://cvv.org.br/) |
| 0800-722-6001 | Disque-Intoxicação | [Anvisa / Renaciat](https://www.gov.br/anvisa/pt-br/assuntos/agrotoxicos/disque-intoxicacao) |
| 180 | Ligue 180 | Violência contra a mulher |
| 100 | Disque 100 | Direitos humanos |
| 199 | Defesa Civil | Variável por município |
| 192 | Peçonhentos (orientação) | Lavar + atendimento; soros via SUS |
| (11) 2627-9528 | Butantan orientação (SP) | Profissionais / referência SP |

## API

```
GET  /emergency/directory?category=&stateCode=
GET  /emergency/contacts?patientId=
POST /emergency/contacts
PATCH /emergency/contacts/:id
DELETE /emergency/contacts/:id   # soft delete
```

## Roadmap geográfico

| Fase | Entrega |
|------|---------|
| **A (hoje)** | Nacional em PG + filtro UF simples |
| **B** | CEATOX/CIATox por estado (seed SQL) |
| **C** | Município (`city_name` + lat/long opcional) |
| **D** | Mapa ou busca por localidade (PostGIS ou API externa) |

**Análise:** começar com **lista + filtro UF** (baixo custo, confiável). Mapa agrega valor para PS/upas próximos, mas exige dados curados ou Google Places + revisão médica. Para Ava hard stops, **números discáveis** (`tel:`) importam mais que mapa.

## Ava e apoio familiar

- Hard stops (`do_not_apply`, vitals críticos) citam SAMU/plano; link para `/emergency`.
- Futuro: `insurance` category preenchida via carteira (telefone urgência do operador).

## Relacionado

- `docs/AGENTS_APOIO.md` — política de linguagem
- `agent-emergency-knowledge` no roadmap
