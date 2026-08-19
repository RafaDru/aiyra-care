import type {
  FamilySupportInsight,
  VitalRuleInput,
} from '../../domain/family-support/family-support.types.js'

function vitalInsight(
  input: VitalRuleInput,
  action: FamilySupportInsight['action'],
  priority: FamilySupportInsight['priority'],
  title: string,
  message: string,
): FamilySupportInsight {
  return {
    id: `vital:${input.typeCode}:${input.observationId}`,
    kind: 'vital_alert',
    action,
    priority,
    title,
    message,
    citations: [{
      kind: 'measurement',
      entityId: input.observationId,
      label: `${input.label} ${input.value}${input.unit ? ` ${input.unit}` : ''}`,
      observedAt: input.observedAt.toISOString(),
    }],
    audience: 'family',
  }
}

export function evaluateVitalRules(inputs: VitalRuleInput[]): FamilySupportInsight[] {
  const insights: FamilySupportInsight[] = []

  for (const v of inputs) {
    if (v.typeCode === 'spo2') {
      if (v.criticalLow != null && v.value < v.criticalLow) {
        insights.push(vitalInsight(
          v,
          'seek_medical_care',
          'urgent',
          'Saturação muito baixa',
          'A saturação registrada está bem abaixo do esperado. Pode ser erro de leitura ou posicionamento do oxímetro — repita a medida com o dedo limpo e aquecido. Se o valor se mantém baixo, procure avaliação médica para uma medição precisa.',
        ))
      } else if (v.value < 92) {
        insights.push(vitalInsight(
          v,
          'discuss_with_doctor',
          'attention',
          'Saturação abaixo do habitual',
          'A saturação está abaixo do habitual para repouso. Vale repetir a leitura. Se persistir, converse com o pediatra — pode ser necessário avaliação presencial.',
        ))
      } else if (v.value < 94) {
        insights.push(vitalInsight(
          v,
          'verify_reading',
          'attention',
          'Saturação no limite inferior',
          'A saturação está um pouco baixa. Confirme se o oxímetro está bem posicionado e repita. Informe o médico se houver outros sintomas ou se a leitura se repetir.',
        ))
      }
      continue
    }

    if (v.typeCode === 'temperature') {
      if (v.criticalHigh != null && v.value >= v.criticalHigh) {
        insights.push(vitalInsight(
          v,
          'seek_medical_care',
          'urgent',
          'Febre alta',
          'A temperatura registrada é alta. Avalie o conforto do filho e as orientações que você já recebeu do pediatra. Se não houver orientação específica ou o quadro preocupa, procure atendimento.',
        ))
      } else if (v.criticalLow != null && v.value <= v.criticalLow) {
        insights.push(vitalInsight(
          v,
          'discuss_with_doctor',
          'attention',
          'Temperatura baixa',
          'A temperatura está abaixo do esperado. Confira se a medição foi feita corretamente e converse com o pediatra se isso se repetir.',
        ))
      }
      continue
    }

    if (v.typeCode === 'heart_rate') {
      if (v.criticalHigh != null && v.value >= v.criticalHigh) {
        insights.push(vitalInsight(
          v,
          'discuss_with_doctor',
          'attention',
          'Batimentos acelerados',
          'Os batimentos registrados estão altos. Contexto de febre ou agitação pode influenciar. Se persistir em repouso ou o filho parece mal, converse com o pediatra.',
        ))
      } else if (v.criticalLow != null && v.value <= v.criticalLow) {
        insights.push(vitalInsight(
          v,
          'discuss_with_doctor',
          'attention',
          'Batimentos baixos',
          'Os batimentos registrados estão baixos. Repita a medida em repouso. Se persistir, converse com o pediatra.',
        ))
      }
    }
  }

  return insights
}

const NSAID_TERMS = [
  'ibuprofeno', 'ibuprofen',
  'nimesulida', 'nimesulide',
  'diclofenaco', 'diclofenac',
  'cetoprofeno', 'ketoprofen',
  'aspirina', 'aas',
]

function normalizeMedName(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

function isNsaid(name: string): boolean {
  const n = normalizeMedName(name)
  return NSAID_TERMS.some((t) => n.includes(t))
}

function tokensMatch(a: string, b: string): boolean {
  const na = normalizeMedName(a)
  const nb = normalizeMedName(b)
  if (!na || !nb) return false
  return na.includes(nb) || nb.includes(na)
}

export function evaluateMedicationSafety(
  proposedName: string,
  allergies: Array<{ id: string; allergen: string; reaction: string | null }>,
  activeMeds: Array<{ id: string; genericName: string; brandName: string | null }>,
): FamilySupportInsight[] {
  const insights: FamilySupportInsight[] = []
  const proposed = normalizeMedName(proposedName)

  for (const allergy of allergies) {
    if (tokensMatch(proposedName, allergy.allergen)) {
      insights.push({
        id: `allergy:${allergy.id}:${proposed}`,
        kind: 'medication_safety',
        action: 'do_not_apply',
        priority: 'critical',
        title: 'Não aplique esta medicação agora',
        message: `Há alergia registrada a "${allergy.allergen}"${allergy.reaction ? ` (reação: ${allergy.reaction})` : ''}. NÃO administre ${proposedName} sem orientação médica imediata. Entre em contato com o pediatra, o canal de urgência do seu plano de saúde ou, em emergência, o SAMU (192) ou o pronto-socorro.`,
        citations: [{
          kind: 'allergy',
          entityId: allergy.id,
          label: allergy.allergen,
        }],
        audience: 'family',
      })
    }
  }

  if (isNsaid(proposedName)) {
    const otherNsaids = activeMeds.filter((m) =>
      isNsaid(m.genericName) || (m.brandName && isNsaid(m.brandName)),
    )
    if (otherNsaids.length > 0) {
      const names = otherNsaids.map((m) => m.genericName).join(', ')
      insights.push({
        id: `nsaid-stack:${proposed}`,
        kind: 'medication_safety',
        action: 'inform_doctor',
        priority: 'attention',
        title: 'Múltiplos anti-inflamatórios',
        message: `Você já tem registro de medicação anti-inflamatória (${names}). Combinar com ${proposedName} pode aumentar riscos. Informe o pediatra antes de administrar.`,
        citations: otherNsaids.map((m) => ({
          kind: 'medication' as const,
          entityId: m.id,
          label: m.genericName,
        })),
        audience: 'family',
      })
    }
  }

  const activeNames = activeMeds.map((m) => m.genericName).filter(Boolean)
  if (activeNames.length > 0 && proposed) {
    insights.push({
      id: `med-context:${proposed}`,
      kind: 'medication_safety',
      action: 'inform_doctor',
      priority: 'info',
      title: 'Medicações em uso',
      message: `Ao conversar com o pediatra, lembre que o tratamento atual inclui: ${activeNames.join(', ')}.`,
      citations: activeMeds.map((m) => ({
        kind: 'medication',
        entityId: m.id,
        label: m.genericName,
      })),
      audience: 'family',
    })
  }

  return insights
}
