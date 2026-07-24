export interface FhirBundle {
  resourceType: 'Bundle'
  id?: string
  type: 'searchset' | 'document'
  total?: number
  entry?: FhirBundleEntry[]
}

interface FhirBundleEntry {
  fullUrl?: string
  resource: FhirResource
}

type FhirResource = FhirPatient | FhirList | FhirComposition

export interface FhirIdentifier {
  system: string
  value: string
}

export interface FhirPatient {
  resourceType: 'Patient'
  id: string
  identifier?: FhirIdentifier[]
  name?: Array<{ use?: string; text?: string }>
  birthDate?: string
  gender?: string
  extension?: Array<{
    url: string
    valueString?: string
    valuePositiveInt?: number
    valueBoolean?: boolean
    valueCodeableConcept?: { coding?: Array<{ system?: string; code?: string; display?: string }> }
    extension?: Array<{ url: string; valueHumanName?: { use?: string; text?: string }; valueCodeableConcept?: { coding?: Array<{ system?: string; code?: string; display?: string }> } }>
  }>
}

export interface FhirList {
  resourceType: 'List'
  id: string
  status: string
  mode: string
  code: { coding: Array<{ system: string; code: string }> }
  subject: { reference: string }
  date?: string
  entry?: Array<{
    flag?: { coding: Array<{ system?: string; code?: string; display?: string }> }
    date?: string
    item: { reference: string; display?: string }
  }>
}

export interface FhirComposition {
  resourceType: 'Composition'
  id: string
  type?: { coding: Array<{ system?: string; code?: string; display?: string }> }
  subject?: { reference: string }
  date?: string
  author?: Array<{ display?: string }>
  title?: string
  section?: Array<{
    title?: string
    code?: { coding: Array<{ system?: string; code?: string; display?: string }> }
    text?: { status: string; div?: string }
    entry?: Array<{ reference: string }>
  }>
}
