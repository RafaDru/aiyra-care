/** Catálogo canônico de exames/procedimentos conhecidos da operadora (Amil).
 *  Fonte de verdade: um mesmo procedimento tem um id/grupo canônico e aliases
 *  (descrições oficiais, siglas, sinônimos) usados para classificação e conferência.
 *  Versionado e editável sem tocar no motor.
 */

export interface CatalogEntry {
  /** Grupo canônico (ex.: 'HEMOGRAMA'). */
  id: string
  /** Nome canônico de exibição. */
  name: string
  /** Rótulos/descrições que mapeiam diretamente para este procedimento. */
  aliases: string[]
  /** Rótulos que disparam fuzzy com este procedimento (não basta categoria). */
  fuzzables?: string[]
}

export interface ExamCatalogLookup {
  /** Nome canônico para um rótulo exato, se houver. */
  byAlias(rawLabel: string): { entry: CatalogEntry; method: 'exact' | 'synonym' | 'acronym' } | null
  /** Melhor correspondência fuzzy (similaridade + candidatos), ou null. */
  bestFuzzy(
    rawLabel: string,
    threshold: number,
  ): { entry: CatalogEntry; similarity: number; distance: number } | null
}

const def = (...aliases: string[]): string[] => aliases

export const EXAM_CATALOG: CatalogEntry[] = [
  {
    id: 'HEMOGRAMA',
    name: 'Hemograma',
    aliases: def(
      'HEMOGRAMA',
      'HEMOGRAMA COMPLETO',
      'HEMOGRAMA COMPLETO COM PLAQUETAS',
      'HEMOGRAMA COMPLETO SEMELHANTE',
    ),
    fuzzables: ['HEMOGRAMA', 'HEMOGRAMA COMPLETO', 'HEMOGRAMA COM PLAQUETAS', 'HEMOGRAMA COMPLETO COM PLAQUETAS'],
  },
  {
    id: 'GLICOSE',
    name: 'Glicose',
    aliases: def('GLICOSE', 'GLICEMIA', 'GLICOSE DE JEJUM', 'GLICEMIA DE JEJUM', 'GLICOSE EM JEJUM'),
    fuzzables: ['GLICOSE', 'GLICEMIA', 'GLICOSE DE JEJUM', 'GLICEMIA EM JEJUM', 'GLICOSE EM JEJUM'],
  },
  {
    id: 'HEMOGLOBINA_GLICADA',
    name: 'Hemoglobina glicada (HbA1c)',
    aliases: def('HEMOGLOBINA GLICADA', 'HEMOGLOBINA GLICOSILADA', 'GLICADA', 'HEMOGLOBINA A1C', 'HBA1C', 'HEMOGLOBINA GLICADA HBA1C'),
    fuzzables: ['HEMOGLOBINA GLICADA', 'HEMOGLOBINA GLICOSILADA', 'GLICADA', 'HEMOGLOBINA A1C', 'HBA1C'],
  },
  {
    id: 'COLESTEROL',
    name: 'Lipidograma (Colesterol)',
    aliases: def('COLESTEROL', 'LIPIDOGRAMA', 'COLESTEROL TOTAL', 'LDL', 'HDL', 'TRIGLICERIDES', 'TRIGLICÉRIDES', 'PERFIL LIPIDICO', 'PERFIL LIPIDICO COMPLETO'),
    fuzzables: ['COLESTEROL', 'LIPIDOGRAMA', 'COLESTEROL TOTAL', 'PERFIL LIPIDICO', 'PERFIL LIPIDICO COMPLETO', 'PERFIL LIPÍDICO'],
  },
  {
    id: 'TSH',
    name: 'TSH (Hormônio tireoestimulante)',
    aliases: def('TSH', 'TSH HORMONIO', 'HORMONIO TIREOESTIMULANTE', 'TSH ULTRASSENSIVEL'),
    fuzzables: ['TSH', 'TSH HORMONIO', 'TSH ULTRASSENSIVEL'],
  },
  {
    id: 'T4_LIVRE',
    name: 'T4 Livre',
    aliases: def('T4 LIVRE', 'TIROXINA LIVRE', 'T4', 'T4L'),
    fuzzables: ['T4 LIVRE', 'TIROXINA LIVRE', 'T4L'],
  },
  {
    id: 'COVID_IGG',
    name: 'SARS-CoV-2 Anticorpos (IgG)',
    aliases: def('SARS COV 2 IGG', 'SARS COV-2 IGG', 'SARS-CoV-2 IGG', 'COVID IGG', 'COVID-19 IGG', 'ANTICORPO ANTI COVID IGG', 'SARS COV 2 ANTICORPO IGG', 'SARS COV 2 ANTICORPO IGG E IGM', 'IGG IGM'),
    fuzzables: ['IGG', 'IGM', 'SARS COV 2', 'SARS COV 2 ANTICORPO', 'COVID'],
  },
  {
    id: 'COVID_PCR',
    name: 'SARS-CoV-2 RT-PCR',
    aliases: def('COVID PCR', 'SARS COV 2 PCR', 'PCR COVID', 'SARS-COV-2 PCR', 'COVID-19 PCR', 'RT PCR COVID'),
    fuzzables: ['PCR COVID', 'SARS COV 2 PCR', 'RT PCR'],
  },
  {
    id: 'COVID_TESTE_RAPIDO',
    name: 'Teste rápido COVID-19',
    aliases: def('TESTE RAPIDO COVID', 'TESTE RAPIDO CORONAVIRUS', 'TESTE RAPIDO COVID-19', 'TESTE RAPIDO IGG IGM'),
    fuzzables: ['TESTE RAPIDO COVID', 'TESTE RAPIDO', 'CORONAVIRUS'],
  },
  {
    id: 'DENGUE',
    name: 'Dengue',
    aliases: def('DENGUE', 'DENGUE IGG IGM', 'DENGUE NS1', 'ANTICORPOS DENGUE', 'SOROLOGIA DENGUE', 'NS1 DENGUE'),
    fuzzables: ['DENGUE', 'DENGUE IGG', 'DENGUE NS1', 'NS1'],
  },
  {
    id: 'ZIKA',
    name: 'Zika',
    aliases: def('ZIKA', 'ZIKA IGG IGM', 'ANTICORPOS ZIKA', 'SOROLOGIA ZIKA'),
    fuzzables: ['ZIKA', 'ZIKA IGG', 'ZIKA IGM'],
  },
  {
    id: 'URINA_EAS',
    name: 'Exame de urina (EAS)',
    aliases: def('EAS', 'URINA I', 'EXAME DE URINA', 'PARCIAL DE URINA', 'URINA', 'URINÁLISE'),
    fuzzables: ['URINA', 'EAS', 'PARCIAL DE URINA', 'EXAME DE URINA'],
  },
  {
    id: 'UROCULTURA',
    name: 'Urocultura',
    aliases: def('UROCULTURA', 'CULTURA DE URINA', 'UROCULTURA COM ANTIBIOGRAMA'),
    fuzzables: ['UROCULTURA', 'CULTURA DE URINA'],
  },
  {
    id: 'CREATININA',
    name: 'Creatinina',
    aliases: def('CREATININA', 'CREATININA SERICA', 'CREATININA PLASMATICA'),
    fuzzables: ['CREATININA', 'CREATININA SERICA'],
  },
  {
    id: 'UREIA',
    name: 'Uréia',
    aliases: def('UREIA', 'UREIA SERICA', 'URÉIA', 'URÉIA SÉRICA'),
    fuzzables: ['UREIA', 'UREIA SERICA', 'URÉIA'],
  },
  {
    id: 'VITAMINA_D',
    name: 'Vitamina D (25-OH)',
    aliases: def('VITAMINA D', '25 OH VITAMINA D', 'VITAMINA D 25 HIDROXI', '25 HIDROXI VITAMINA D', '25OH VITAMINA D'),
    fuzzables: ['VITAMINA D', '25 OH VITAMINA D', '25 HIDROXI VITAMINA D'],
  },
  {
    id: 'FERRITINA',
    name: 'Ferritina',
    aliases: def('FERRITINA', 'FERRITINA SERICA'),
    fuzzables: ['FERRITINA'],
  },
  {
    id: 'FERRO_SERICO',
    name: 'Ferro sérico',
    aliases: def('FERRO SERICO', 'FERRO', 'FERRRO SERICO'),
    fuzzables: ['FERRO SERICO', 'FERRO'],
  },
  {
    id: 'VITAMINA_B12',
    name: 'Vitamina B12',
    aliases: def('VITAMINA B12', 'B12', 'CIANOCOBALAMINA'),
    fuzzables: ['VITAMINA B12', 'B12'],
  },
  {
    id: 'HORMONIO_FSH',
    name: 'FSH',
    aliases: def('FSH', 'HORMONIO FOLICULO ESTIMULANTE', 'FSH HORMONIO'),
    fuzzables: ['FSH', 'HORMONIO FOLICULO ESTIMULANTE'],
  },
  {
    id: 'HORMONIO_LH',
    name: 'LH',
    aliases: def('LH', 'HORMONIO LUTEINIZANTE', 'LH HORMONIO'),
    fuzzables: ['LH', 'HORMONIO LUTEINIZANTE'],
  },
  {
    id: 'PROLACTINA',
    name: 'Prolactina',
    aliases: def('PROLACTINA', 'PROLACTINA SERICA'),
    fuzzables: ['PROLACTINA'],
  },
  {
    id: 'TESTOSTERONA',
    name: 'Testosterona',
    aliases: def('TESTOSTERONA', 'TESTOSTERONA TOTAL', 'TESTOSTERONA LIVRE'),
    fuzzables: ['TESTOSTERONA', 'TESTOSTERONA TOTAL', 'TESTOSTERONA LIVRE'],
  },
  {
    id: 'PCR_PROTEINA_C',
    name: 'Proteína C reativa',
    aliases: def('PCR', 'PROTEINA C REATIVA', 'PCR US', 'PCR ULTRASSENSIVEL'),
    fuzzables: ['PROTEINA C REATIVA', 'PCR US', 'PCR'],
  },
  {
    id: 'HEMOCULTURA',
    name: 'Hemocultura',
    aliases: def('HEMOCULTURA', 'CULTURA DE SANGUE', 'HEMOCULTURA COM ANTIBIOGRAMA'),
    fuzzables: ['HEMOCULTURA', 'CULTURA DE SANGUE'],
  },
  {
    id: 'CULTURA_SECRECAO',
    name: 'Cultura de secreção',
    aliases: def('CULTURA DE SECRECAO', 'CULTURA DE SECREÇÃO', 'CULTURA SECRECAO'),
    fuzzables: ['CULTURA DE SECRECAO', 'CULTURA DE SECREÇÃO', 'SECRECAO'],
  },
]

/** Palavras-chave que indicam exames mesmo fora do catálogo. */
export const EXAM_KEYWORDS = [
  'EXAME', 'SOROLOGIA', 'DOSAGEM', 'ANTICORPO', 'CULTURA', 'BIOPSIA',
  'RADIOGRAFIA', 'RESSONANCIA', 'TOMOGRAFIA', 'ULTRASSON', 'ECOCARDIOGRAMA',
  'ELETROCARDIOGRAMA', 'ESPELHOMETRIA', 'MAPEAMENTO', 'AVE', 'PACIENTE',
  'GLICEMIA', 'PROCTOSCOPIA', 'MANOMETRIA', 'ERITROGRAMA', 'HEMOGRAMA',
]

/** Palavras-chave que indicam consulta. */
export const CONSULTA_KEYWORDS = [
  'CONSULTA', 'RETORNO', 'PRIMEIRA VEZ', 'PRIMEIRA CONSULTA', 'CONSULTA MEDICA',
  'CONSULTA EM PRONTO SOCORRO', 'CONSULTA DE PS', 'CONSULTA EM CLINICA',
  'URGENCIA', 'EMERGENCIA', 'PRONTO ATENDIMENTO', 'ATENDIMENTO AMBULATORIAL',
  'TELEMEDICINA', 'TELECONSULTA', 'CONSULTA DE URGENCIA', 'PED', 'PEDIATRIA',
  'CONSULTA PEDIATRICA', 'CONSULTA EM CARDIOLOGIA', 'CONSULTA EM PEDIATRIA',
]

/** Palavras-chave que indicam procedimentos (não consulta/exame). */
export const PROCEDIMENTO_KEYWORDS = [
  'CIRURGIA', 'PROCEDIMENTO', 'CURATIVO', 'SESSÃO', 'SESSAO', 'FISIOTERAPIA',
  'INJECAO', 'INFUSAO', 'TRANSFUSAO', 'HIDRATACAO', 'NEBULIZACAO',
]
