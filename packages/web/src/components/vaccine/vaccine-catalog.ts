/** Calendário vacinal infantil PNI — estrutura fixa; o SUS preenche os campos variáveis por conferência. */
export interface CatalogDose {
  dose: number
  ageMonths: number
}

export interface VaccineCatalogEntry {
  id: string
  displayName: string
  aliases: string[]
  /** Código BRImunobiologico (RNDS) */
  rndsCodes?: string[]
  doses: CatalogDose[]
}

/** Slot único no calendário (vacina + dose + período previsto). */
export interface CatalogSlot {
  slotKey: string
  catalogId: string
  vaccineName: string
  doseNumber: number
  ageMonths: number
}

export const VACCINE_CATALOG: VaccineCatalogEntry[] = [
  {
    id: 'bcg',
    displayName: 'BCG',
    aliases: ['bcg', 'bacilo calmette guerin', 'bacilo calmette'],
    rndsCodes: ['15'],
    doses: [{ dose: 1, ageMonths: 0 }],
  },
  {
    id: 'hepatite_b',
    displayName: 'Hepatite B',
    aliases: ['hepatite b', 'hep b', 'hepatite b recombinante', 'recombinante hepatite'],
    rndsCodes: ['44', '20', '63', '62'],
    doses: [{ dose: 1, ageMonths: 0 }, { dose: 2, ageMonths: 2 }],
  },
  {
    id: 'hexa',
    displayName: 'Hexavalente',
    aliases: [
      'hexavalente', 'pentavalente', 'difteria tetano pertussis', 'difteria e tetano',
      'poliomielite inativada', 'vip', 'vap', 'haemophilus', 'combinada difteria',
    ],
    rndsCodes: ['42', '29', '22', '28', '17'],
    doses: [{ dose: 1, ageMonths: 2 }, { dose: 2, ageMonths: 4 }, { dose: 3, ageMonths: 6 }],
  },
  {
    id: 'pneumo10',
    displayName: 'Pneumocócica 10',
    aliases: ['pneumococica', 'pneumo 10', 'pneumo10', 'vpc10', 'conjugada pneumococica', 'prevnar'],
    rndsCodes: ['26', '59'],
    doses: [{ dose: 1, ageMonths: 2 }, { dose: 2, ageMonths: 4 }, { dose: 3, ageMonths: 12 }],
  },
  {
    id: 'rota',
    displayName: 'Rotavírus',
    aliases: ['rotavirus', 'rota humano', 'rotateq', 'rotarix'],
    doses: [{ dose: 1, ageMonths: 2 }, { dose: 2, ageMonths: 4 }],
  },
  {
    id: 'meningo_c',
    displayName: 'Meningocócica C',
    aliases: ['meningococica c', 'meningo c', 'meningococo c', 'nimenrix'],
    doses: [{ dose: 1, ageMonths: 3 }, { dose: 2, ageMonths: 5 }, { dose: 3, ageMonths: 12 }],
  },
  {
    id: 'covid',
    displayName: 'COVID-19',
    aliases: ['covid', 'coronavirus', 'sars cov', 'pfizer pediatrica', 'coronavac'],
    doses: [{ dose: 1, ageMonths: 6 }, { dose: 2, ageMonths: 7 }],
  },
  {
    id: 'influenza',
    displayName: 'Influenza',
    aliases: ['influenza', 'gripe', 'flu trivalente', 'flu'],
    doses: [{ dose: 1, ageMonths: 6 }],
  },
  {
    id: 'febre_amarela',
    displayName: 'Febre Amarela',
    aliases: ['febre amarela', 'yellow fever'],
    doses: [{ dose: 1, ageMonths: 9 }, { dose: 2, ageMonths: 48 }],
  },
  {
    id: 'meningo_acwy',
    displayName: 'Meningocócica ACWY',
    aliases: ['meningococica acwy', 'meningo acwy', 'menveo', 'acwy'],
    doses: [{ dose: 1, ageMonths: 12 }],
  },
  {
    id: 'triplice_viral',
    displayName: 'Tríplice Viral',
    aliases: ['triplice viral', 'sarampo caxumba rubela', 'scr', 'priorix', 'mmr'],
    doses: [{ dose: 1, ageMonths: 12 }, { dose: 2, ageMonths: 15 }],
  },
  {
    id: 'tetra_viral',
    displayName: 'Tetra Viral',
    aliases: ['tetra viral', 'tetraviral', 'scr varicela'],
    doses: [{ dose: 1, ageMonths: 15 }],
  },
  {
    id: 'varicela',
    displayName: 'Varicela',
    aliases: ['varicela', 'catapora', 'attenuada varicela'],
    doses: [{ dose: 1, ageMonths: 15 }, { dose: 2, ageMonths: 48 }],
  },
  {
    id: 'dtpa',
    displayName: 'dTpa',
    aliases: ['dtpa', 'triplice bacteriana acelular', 'boostrix', 'adacel', 'difteria tetano pertussis acelular'],
    doses: [{ dose: 1, ageMonths: 48 }],
  },
  {
    id: 'hpv',
    displayName: 'HPV',
    aliases: ['hpv', 'papilomavirus humano', 'gardasil', 'quadrivalente hpv'],
    doses: [{ dose: 1, ageMonths: 132 }, { dose: 2, ageMonths: 132 }],
  },
  {
    id: 'dengue',
    displayName: 'Dengue',
    aliases: [
      'dengue',
      'qdenga',
      'dng',
      'vacina dng',
      'recombinante e atenuada',
      'recombinante atenuada',
      'tetravalente dengue',
    ],
    doses: [{ dose: 1, ageMonths: 48 }, { dose: 2, ageMonths: 48 }],
  },
]

export function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/^\s*(vacina|imunobiologico|imunológico)\s+/i, '')
    .replace(/\s+(vacina|imunobiologico|imunológico)\s*/gi, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function slotKey(catalogId: string, doseNumber: number): string {
  return `${catalogId}:${doseNumber}`
}

export function getCatalogSlot(catalogId: string, doseNumber: number): CatalogSlot | undefined {
  const entry = VACCINE_CATALOG.find((e) => e.id === catalogId)
  if (!entry) return undefined
  const doseDef = entry.doses.find((d) => d.dose === doseNumber)
  if (!doseDef) return undefined
  return {
    slotKey: slotKey(catalogId, doseNumber),
    catalogId,
    vaccineName: entry.displayName,
    doseNumber,
    ageMonths: doseDef.ageMonths,
  }
}

/** Todos os slots do calendário pré-catalogado, ordenados por idade prevista. */
export function getAllCatalogSlots(): CatalogSlot[] {
  const slots: CatalogSlot[] = []
  for (const entry of VACCINE_CATALOG) {
    for (const d of entry.doses) {
      slots.push({
        slotKey: slotKey(entry.id, d.dose),
        catalogId: entry.id,
        vaccineName: entry.displayName,
        doseNumber: d.dose,
        ageMonths: d.ageMonths,
      })
    }
  }
  return slots.sort((a, b) => a.ageMonths - b.ageMonths || a.catalogId.localeCompare(b.catalogId))
}

export function findCatalogEntry(rawName: string): VaccineCatalogEntry | undefined {
  const norm = normalizeKey(rawName)
  if (!norm) return undefined
  for (const entry of VACCINE_CATALOG) {
    if (normalizeKey(entry.displayName) === norm) return entry
    for (const alias of entry.aliases) {
      const a = normalizeKey(alias)
      if (norm === a || norm.includes(a) || a.includes(norm)) return entry
    }
  }
  return undefined
}

const RNDS_LOOKUP = new Map<string, string>()
for (const entry of VACCINE_CATALOG) {
  for (const code of entry.rndsCodes ?? []) RNDS_LOOKUP.set(code, entry.id)
}

export function catalogIdFromRndsCode(code?: string | null): string | undefined {
  if (!code) return undefined
  return RNDS_LOOKUP.get(code.replace(/\D/g, ''))
}
