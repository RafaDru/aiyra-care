export type EmergencyDirectoryCategory =
  | 'medical'
  | 'fire_rescue'
  | 'police'
  | 'poison'
  | 'mental_health'
  | 'violence_support'
  | 'human_rights'
  | 'venomous_animal'
  | 'civil_defense'
  | 'insurance'
  | 'other'

export type EmergencyDirectoryScope = 'national' | 'state' | 'city'

export interface EmergencyDirectoryEntry {
  id: string
  category: EmergencyDirectoryCategory
  scope: EmergencyDirectoryScope
  stateCode: string | null
  cityName: string | null
  name: string
  phone: string
  phoneAlt: string | null
  description: string | null
  instructions: string | null
  sourceUrl: string | null
  officialOrg: string | null
  available24h: boolean
  sortOrder: number
}
