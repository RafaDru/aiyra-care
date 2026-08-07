/** Calendário PNI + códigos BRImunobiologico (RNDS / SIPNI). */

export interface CatalogDoseDef {
  dose: number
  ageMonths: number
}

export interface VaccineCatalogEntry {
  id: string
  displayName: string
  aliases: string[]
  /** Códigos oficiais MS — https://terminologia.saude.gov.br/fhir/CodeSystem/BRImunobiologico */
  rndsCodes: string[]
  doses: CatalogDoseDef[]
}

export const VACCINE_CATALOG: VaccineCatalogEntry[] = [
  { id: 'bcg', displayName: 'BCG', aliases: ['bcg', 'bacilo calmette'], rndsCodes: ['15'], doses: [{ dose: 1, ageMonths: 0 }] },
  {
    id: 'hepatite_b',
    displayName: 'Hepatite B',
    aliases: ['hepatite b', 'hep b', 'hepatite b recombinante'],
    rndsCodes: ['44', '20', '63', '62', '45'],
    doses: [{ dose: 1, ageMonths: 0 }, { dose: 2, ageMonths: 2 }],
  },
  {
    id: 'hexa',
    displayName: 'Hexavalente',
    aliases: ['hexavalente', 'pentavalente', 'penta', 'vip', 'vop', 'haemophilus', 'difteria tetano'],
    rndsCodes: ['42', '29', '22', '28', '17', '46', '50'],
    doses: [{ dose: 1, ageMonths: 2 }, { dose: 2, ageMonths: 4 }, { dose: 3, ageMonths: 6 }],
  },
  {
    id: 'pneumo10',
    displayName: 'Pneumocócica 10',
    aliases: ['pneumococica', 'pneumo 10', 'vpc10', 'vpc13', 'prevnar'],
    rndsCodes: ['26', '59', '106'],
    doses: [{ dose: 1, ageMonths: 2 }, { dose: 2, ageMonths: 4 }, { dose: 3, ageMonths: 12 }],
  },
  {
    id: 'rota',
    displayName: 'Rotavírus',
    aliases: ['rotavirus', 'rota humano', 'rotateq', 'rotarix'],
    rndsCodes: ['65'],
    doses: [{ dose: 1, ageMonths: 2 }, { dose: 2, ageMonths: 4 }],
  },
  {
    id: 'meningo_c',
    displayName: 'Meningocócica C',
    aliases: ['meningococica c', 'meningo c', 'men bc'],
    rndsCodes: ['66', '13', '52'],
    doses: [{ dose: 1, ageMonths: 3 }, { dose: 2, ageMonths: 5 }, { dose: 3, ageMonths: 12 }],
  },
  {
    id: 'covid',
    displayName: 'COVID-19',
    aliases: ['covid', 'coronavirus', 'comirnaty', 'coronavac', 'pfizer'],
    rndsCodes: ['87', '86', '85', '99', '102', '103', '105', '98', '96', '95'],
    doses: [{ dose: 1, ageMonths: 6 }, { dose: 2, ageMonths: 7 }],
  },
  {
    id: 'influenza',
    displayName: 'Influenza',
    aliases: ['influenza', 'gripe', 'flu', 'gripe sazonal'],
    rndsCodes: ['72', '33', '64', '110'],
    doses: [{ dose: 1, ageMonths: 6 }],
  },
  {
    id: 'febre_amarela',
    displayName: 'Febre Amarela',
    aliases: ['febre amarela', 'vfa'],
    rndsCodes: ['14', '84'],
    doses: [{ dose: 1, ageMonths: 9 }, { dose: 2, ageMonths: 48 }],
  },
  {
    id: 'meningo_acwy',
    displayName: 'Meningocócica ACWY',
    aliases: ['meningococica acwy', 'menacwy', 'menveo'],
    rndsCodes: ['74'],
    doses: [{ dose: 1, ageMonths: 12 }],
  },
  {
    id: 'triplice_viral',
    displayName: 'Tríplice Viral',
    aliases: ['triplice viral', 'scr', 'sarampo', 'caxumba', 'rubela'],
    rndsCodes: ['24', '53', '70', '71', '36'],
    doses: [{ dose: 1, ageMonths: 12 }, { dose: 2, ageMonths: 15 }],
  },
  {
    id: 'tetra_viral',
    displayName: 'Tetra Viral',
    aliases: ['tetra viral', 'tetraviral', 'quadrupla viral'],
    rndsCodes: ['56', '58', '73'],
    doses: [{ dose: 1, ageMonths: 15 }],
  },
  {
    id: 'varicela',
    displayName: 'Varicela',
    aliases: ['varicela', 'catapora'],
    rndsCodes: ['34', '54', '91'],
    doses: [{ dose: 1, ageMonths: 15 }, { dose: 2, ageMonths: 48 }],
  },
  {
    id: 'dtpa',
    displayName: 'dTpa',
    aliases: ['dtpa', 'boostrix', 'adacel', 'triplice bacteriana acelular'],
    rndsCodes: ['57', '111'],
    doses: [{ dose: 1, ageMonths: 48 }],
  },
  {
    id: 'hpv',
    displayName: 'HPV',
    aliases: ['hpv', 'papilomavirus', 'gardasil'],
    rndsCodes: ['67', '60', '68', '93'],
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
    rndsCodes: ['104'],
    doses: [{ dose: 1, ageMonths: 48 }, { dose: 2, ageMonths: 48 }],
  },
]

const RNDS_LOOKUP = new Map<string, string>()
for (const entry of VACCINE_CATALOG) {
  for (const code of entry.rndsCodes) RNDS_LOOKUP.set(code, entry.id)
}

export function catalogIdFromRndsCode(code?: string | null): string | undefined {
  if (!code) return undefined
  const c = code.replace(/\D/g, '')
  return RNDS_LOOKUP.get(c)
}

export function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/^\s*(vacina|imunobiologico)\s+/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
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

export function getCatalogSlot(catalogId: string, doseNumber: number): { slotKey: string; entry: VaccineCatalogEntry; dose: CatalogDoseDef } | undefined {
  const entry = VACCINE_CATALOG.find((e) => e.id === catalogId)
  if (!entry) return undefined
  const dose = entry.doses.find((d) => d.dose === doseNumber) ?? entry.doses[0]
  return { slotKey: `${catalogId}:${dose.dose}`, entry, dose }
}

export function slotKey(catalogId: string, doseNumber: number): string {
  return `${catalogId}:${doseNumber}`
}
