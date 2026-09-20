const LABELS: Record<string, string> = {
  unimed: 'Unimed BH',
  amil: 'Amil',
  bradesco_saude: 'Bradesco Saúde',
  mater_dei: 'Meu Mater Dei',
  hermes_pardini: 'Grupo Fleury',
  conectesus: 'ConecteSUS',
}

export function portalTypeLabel(portalType: string): string {
  return LABELS[portalType] ?? portalType.replace(/_/g, ' ')
}
