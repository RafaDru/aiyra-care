/** Marcas do ecossistema Grupo Fleury — Precision Care (UI; um vínculo `hermes_pardini`). */
export interface FleuryLabBrand {
  id: 'pardini' | 'fleury' | 'a_mais' | 'labs_a'
  label: string
  shortLabel: string
  color: string
  searchAliases: string[]
}

export const FLEURY_GROUP_LABEL = 'Grupo Fleury'
export const FLEURY_GROUP_FULL_LABEL = 'Grupo Fleury — Precision Care'
export const FLEURY_GROUP_DESCRIPTION =
  'Hermes Pardini, Fleury, a+ e Labs a+ — um login no portal de resultados'

export const FLEURY_LAB_BRANDS: FleuryLabBrand[] = [
  {
    id: 'pardini',
    label: 'Hermes Pardini',
    shortLabel: 'Pardini',
    color: '#d21e48',
    searchAliases: ['pardini', 'hermes', 'hermes pardini', 'belo horizonte', 'bh'],
  },
  {
    id: 'fleury',
    label: 'Fleury',
    shortLabel: 'Fleury',
    color: '#003da5',
    searchAliases: ['fleury', 'são paulo', 'sao paulo', 'sp'],
  },
  {
    id: 'a_mais',
    label: 'a+',
    shortLabel: 'a+',
    color: '#00a651',
    searchAliases: ['a+', 'a mais', 'amais', 'a mais saúde'],
  },
  {
    id: 'labs_a',
    label: 'Labs a+',
    shortLabel: 'Labs a+',
    color: '#7b2cbf',
    searchAliases: ['labs', 'labs a+', 'labsa', 'laboratório a+'],
  },
]

export const FLEURY_GROUP_SEARCH_ALIASES = [
  'grupo fleury',
  'fleury',
  'precision care',
  'precision',
  'resultados',
  'grupofleury',
  ...FLEURY_LAB_BRANDS.flatMap((b) => b.searchAliases),
]

export function fleurySearchText(): string {
  return [
    FLEURY_GROUP_FULL_LABEL,
    FLEURY_GROUP_DESCRIPTION,
    ...FLEURY_GROUP_SEARCH_ALIASES,
    ...FLEURY_LAB_BRANDS.map((b) => b.label),
  ].join(' ').toLowerCase()
}

export function matchesFleurySearch(query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return fleurySearchText().includes(q)
}
