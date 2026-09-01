/** Marcas do ecossistema Grupo Fleury — Precision Care (UI; um vínculo `hermes_pardini`). */
export interface FleuryLabBrand {
  id: 'pardini' | 'fleury' | 'a_mais' | 'labs_a'
  label: string
  shortLabel: string
  color: string
  searchAliases: string[]
  /** PNG/SVG em `public/brands/fleury/` (oficial ou CDN Grupo Fleury). */
  logoSrc: string
  logoBg?: string
}

export const FLEURY_GROUP_LABEL = 'Grupo Fleury'
export const FLEURY_GROUP_FULL_LABEL = 'Grupo Fleury — Precision Care'
export const FLEURY_GROUP_DESCRIPTION =
  'Hermes Pardini, Fleury, a+ e Labs a+ — um login no portal de resultados'

export const FLEURY_GROUP_LOGO_SRC = '/brands/fleury/grupo-fleury.svg'

export const FLEURY_LAB_BRANDS: FleuryLabBrand[] = [
  {
    id: 'pardini',
    label: 'Hermes Pardini',
    shortLabel: 'Pardini',
    color: '#d21e48',
    searchAliases: ['pardini', 'hermes', 'hermes pardini', 'belo horizonte', 'bh'],
    logoSrc: '/brands/fleury/hermes-pardini.png',
    logoBg: '#ffffff',
  },
  {
    id: 'fleury',
    label: 'Fleury',
    shortLabel: 'Fleury',
    color: '#e91e8c',
    searchAliases: ['fleury', 'são paulo', 'sao paulo', 'sp'],
    logoSrc: '/brands/fleury/fleury-lab-wordmark.png',
    logoBg: '#ffffff',
  },
  {
    id: 'a_mais',
    label: 'a+',
    shortLabel: 'a+',
    color: '#00a8e8',
    searchAliases: ['a+', 'a mais', 'amais', 'a mais saúde'],
    logoSrc: '/brands/fleury/a-mais.png',
    logoBg: '#ffffff',
  },
  {
    id: 'labs_a',
    label: 'Labs a+',
    shortLabel: 'Labs a+',
    color: '#003da5',
    searchAliases: ['labs', 'labs a+', 'labsa', 'laboratório a+'],
    logoSrc: '/brands/fleury/labs-a.png',
    logoBg: '#ffffff',
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
