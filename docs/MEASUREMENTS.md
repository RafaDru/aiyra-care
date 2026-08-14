# Medidas e séries temporais — modelo proposto

> **Status:** proposta de arquitetura (2026-08-14)  
> **Substitui gradualmente:** `growth_records` (colunas fixas)  
> **Roadmap:** `plat-medidas` em `docs/roadmap.json`

## Problema hoje

`growth_records` é uma **linha larga** com colunas fixas (`weight_kg`, `height_cm`, `head_circumference_cm`, …). Funciona para antropometria pediátrica, mas:

- Cada novo parâmetro (glicemia, SpO₂, temperatura, BPM) exige migration + API + form + gráfico duplicado.
- `GrowthTab.tsx` repete o mesmo `LineChart` quatro vezes.
- Mistura **data de consulta** (`record_date` DATE) com **momento da medição** (vitals podem ser horários).
- Percentuais WHO e BMI são **derivados** — não deveriam ser colunas obrigatórias na observação bruta.

## Princípios

1. **Catálogo + observações** — tipo mensurável está no catálogo; valores são linhas repetíveis.
2. **Uma observação = um tipo + um instante + um valor** (ou componentes para BP).
3. **Gráficos dirigidos por config** — UI lê `chart_config` do catálogo; componentes Recharts genéricos.
4. **Postgres fonte da verdade** — curvas de referência (WHO) e percentis são camada de **análise**, não duplicam o valor medido.
5. **Compatível com FHIR Observation** — facilita import ConecteSUS / dispositivos no futuro.

## Modelo de dados

### 1. Catálogo `measurement_types`

Vocabulário controlado (seed + eventual admin). Não é “enum travado” no CHECK — permite novos tipos sem migration.

| Coluna | Tipo | Exemplo |
|--------|------|---------|
| `code` | VARCHAR PK | `weight`, `height`, `head_circumference`, `temperature`, `spo2`, `glucose`, `heart_rate`, `blood_pressure` |
| `category` | VARCHAR | `anthropometry`, `vital_sign`, `lab_point`, `derived` |
| `label_key` | VARCHAR | i18n: `measurement.type.weight` |
| `default_unit` | VARCHAR | `kg`, `cm`, `°C`, `%`, `mg/dL`, `bpm`, `mmHg` |
| `value_kind` | VARCHAR | `scalar`, `composite` |
| `precision` | SMALLINT | decimais para exibição |
| `normal_range` | JSONB | `{ min, max, criticalLow, criticalHigh }` opcional |
| `chart_config` | JSONB | ver abaixo |
| `sort_order` | INT | ordem na UI |
| `active` | BOOLEAN | |

**`chart_config` (exemplo):**

```json
{
  "enabled": true,
  "chartKind": "line",
  "color": "#1677ff",
  "yAxisGroup": "mass",
  "domain": ["auto", "auto"],
  "connectNulls": true,
  "showInCombined": false
}
```

Para pressão arterial (`composite`):

```json
{
  "enabled": true,
  "chartKind": "dual-line",
  "components": [
    { "code": "systolic", "color": "#cf1322", "labelKey": "measurement.component.systolic" },
    { "code": "diastolic", "color": "#1677ff", "labelKey": "measurement.component.diastolic" }
  ]
}
```

### 2. Observações `measurement_observations`

| Coluna | Tipo | Notas |
|--------|------|--------|
| `id` | UUID PK | |
| `patient_id` | UUID FK | |
| `type_code` | VARCHAR FK → `measurement_types` | |
| `observed_at` | TIMESTAMPTZ | instante real (vitals); antropometria pode ser só dia |
| `value_numeric` | NUMERIC | valor principal |
| `value_secondary` | NUMERIC | componente 2 (ex.: diastólica) ou null |
| `unit` | VARCHAR | override do default_unit |
| `source` | VARCHAR | `manual`, `import`, `device`, `computed` |
| `source_ref` | VARCHAR | `exam:{id}`, `document:{id}`, `growth_record:{id}` |
| `context` | JSONB | `{ meal: "fasting", position: "sitting", device: "oximeter" }` |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

Índices: `(patient_id, type_code, observed_at DESC)`, `(patient_id, observed_at DESC)`.

**Regra:** BMI não é armazenado como observação primária — `type_code = bmi` com `source = computed` opcional, calculado ao salvar peso+altura próximos.

### 3. Tipos iniciais (seed)

| code | categoria | unidade | notas |
|------|-----------|---------|--------|
| `weight` | anthropometry | kg | |
| `height` | anthropometry | cm | |
| `head_circumference` | anthropometry | cm | PC |
| `temperature` | vital_sign | °C | |
| `spo2` | vital_sign | % | saturação |
| `heart_rate` | vital_sign | bpm | |
| `glucose` | lab_point | mg/dL | contexto refeição em `context` |
| `blood_pressure` | vital_sign | mmHg | composite: value=sistólica, value_secondary=diastólica |

Futuro: diâmetro (ex. `abdomen_circumference`), peso específico, peak flow, etc. — só seed + i18n.

## API (hexagonal)

```
domain/measurement/
  measurement-type.entity.ts      # catálogo
  measurement-observation.entity.ts
  measurement.repository.ts

application/measurement/
  measurement.service.ts          # CRUD, bulk por paciente
  measurement-chart.service.ts    # série temporal agrupada por type_code
  measurement-derived.service.ts  # BMI, percentil (fase 2)

infrastructure/http/measurement/
  GET  /measurement-types
  GET  /patients/:id/measurements?types=weight,height&from=&to=
  POST /patients/:id/measurements
  PATCH/DELETE /measurements/:id
  GET  /patients/:id/measurements/chart-series?types=...  # opcional: pré-agregado para UI
```

**Resposta agrupada para gráficos:**

```json
{
  "series": [
    {
      "typeCode": "weight",
      "unit": "kg",
      "chartConfig": { ... },
      "points": [
        { "observedAt": "2026-01-15T00:00:00Z", "value": 20.5, "valueSecondary": null }
      ]
    }
  ]
}
```

### Migração `growth_records`

1. Migration `037_measurement_observations.sql` — tabelas novas.
2. Backfill script: cada linha `growth_records` → 1–3 observações (`weight`, `height`, `head_circumference`) com `observed_at = record_date`, `source_ref = growth_record:{id}`.
3. Manter `GET /growth-records` como **adapter de leitura** (monta vista legada) por 1 release; forms novos usam `/measurements`.
4. Remover `growth_records` quando UI 100% migrada.

## UI — componentes composables

```
packages/web/src/components/measurements/
  MeasurementChart.tsx          # um tipo → um gráfico (Recharts)
  MeasurementChartGrid.tsx    # lê catálogo + séries; grid responsivo
  MeasurementCombinedChart.tsx # dual-axis quando chart_config pede
  MeasurementEntryForm.tsx    # form dinâmico por type (scalar vs composite)
  measurement-chart.types.ts
  measurement-catalog.ts      # fallback client se API types indisponível
```

### `MeasurementChart` props

```typescript
type MeasurementChartProps = {
  series: ChartSeriesPayload   # points + chartConfig + unit
  height?: number
  onPointClick?: (point: ChartPoint) => void  # abrir detalhe / editar
}
```

### `MeasurementChartGrid`

- Filtra tipos com `chart_config.enabled` e `points.length > 0`.
- Layout: `repeat(auto-fit, minmax(280px, 1fr))` (igual Medidas hoje).
- **Ações:** clique no ponto → drawer com notas, fonte, link a exame se `source_ref`.

### Aba paciente

- Renomear **Medidas** → manter label família; internamente `MeasurementsTab`.
- Sub-abas opcionais: **Gráficos** | **Histórico** | **Registrar** (ou tudo na mesma página).
- Filtro por categoria: Antropometria | Sinais vitais | Laboratorial.

## Tipos de visualização (`chartKind`)

| chartKind | Uso | Recharts |
|-----------|-----|----------|
| `line` | série única escalar | `LineChart` + `Line` |
| `area` | SpO₂, tendência suave | `AreaChart` |
| `dual-line` | PA sistólica/diastólica | 2 `Line` mesma escala |
| `dual-axis` | peso + altura combinado | 2 `YAxis` |
| `range-band` | futuro: faixa normal sombreada | `ReferenceArea` + `normal_range` |
| `reference-curve` | futuro: curvas WHO | linha paciente + curvas LMS |

Implementação incremental: `line` → `dual-axis` → `range-band` → WHO.

## Derivados e alertas (fase 2)

| Derivado | Entrada | Onde |
|----------|---------|------|
| BMI | weight + height (±24h) | `measurement-derived.service` |
| Percentil peso/altura | weight/height + sexo + idade | tabela WHO ou API externa |
| Alerta contexto | glucose fora de `normal_range` | `PatientContextService` pendências |

Não bloqueia MVP de catálogo + gráficos.

## Integrações futuras

| Fonte | Mapeamento |
|-------|------------|
| Exame laboratorial | import glucose, etc. → `source=import`, `source_ref=exam:{id}` |
| OCR laudo | parser extrai valor → observação |
| Dispositivo / Apple Health | batch POST measurements |
| FHIR Observation | adapter Connect → `measurement_observations` |

## Bounded context

- **Core** — `measurement_*` (dado clínico longitudinal do paciente).
- **Não** colocar em Connect — importadores **Core** criam observações após canonical entity.
- Neo4j (opcional): nó `Measurement` ligado a `Patient` para correlação em agentes — depois de PG estável.

## Jornada monitoramento dia-a-dia (enfermidade infantil)

Caso de uso: febre/virose — temperatura, BPM e SpO₂ várias vezes ao dia; medicação (dipirona, paracetamol, ibuprofeno) com horário; eventos (vômito, evacuação alterada); tudo vinculado a um **Acompanhamento** (`health_thread_id`) para export ao pediatra.

### Fase 1 (implementada)

- `measurement_observations` com `observed_at` TIMESTAMPTZ + `health_thread_id`
- `medication_administrations` — log rápido de dose com horário (sem exigir cadastro completo de `medications`)
- Tipos seed: vitals + sintomas `vomit`, `stool_abnormal`
- API: `POST /measurements/batch` (vitals em um clique), `GET /measurements/timeline` (medidas + meds + sintomas)
- UI aba **Medidas**: monitoramento, gráficos composables, antropometria

### Fase 2 (implementada)

- `care_reminders` — lembretes de medida e medicação com intervalo
- API: pending, illness-pack, complete, snooze, `GET /monitoring-export`
- UI: banner de lembretes, iniciar monitoramento, export imprimível, faixa normal nos gráficos
- Pendências no resumo clínico (`measurement_reminder`, `medication_reminder`)

### Fase 2b (backlog)

- Push notifications (web/mobile)
- Fluxo notificação nativa → modal de entrada

### Fase 3 (backlog)

- Import glicemia de exames; dispositivos (oxímetro, termômetro BLE)
- Curvas WHO pediátricas

## Plano de implementação

| Fase | Entrega |
|------|---------|
| **1** | Migration 037 + seed + API + backfill growth + UI monitoramento |
| **2** | `MeasurementChart` + `MeasurementChartGrid` + tab Medidas migrada |
| **3** | Form multi-tipo + context (glicemia refeição) + i18n |
| **4** | BMI computado + faixas normais no gráfico |
| **5** | Curvas WHO pediátricas + percentis |
| **6** | Deprecar `growth_records` |

## Decisões explícitas

| Decisão | Motivo |
|---------|--------|
| Catálogo em PG, não enum TS | Novos tipos sem deploy de schema |
| `observed_at` TIMESTAMPTZ | Vitals intradiários; antropometria usa meia-noite local |
| `chart_config` no catálogo | UI composable; um lugar para cor/eixo |
| Não duplicar BMI na entrada manual | Evita inconsistência |
| Manter compat `growth-records` temporário | Zero regressão na família |

## Relacionado

- `packages/web/src/pages/patient/tabs/GrowthTab.tsx` — implementação atual
- `database/relational/001_initial_schema.sql` — `growth_records`
- FHIR R4 [Observation](https://hl7.org/fhir/R4/observation.html) — referência de modelagem
