export type ProfileStepValues = {
  name: string
  socialName?: string
  birthDate: { toDate: () => Date }
  gender: 'male' | 'female'
  cpf: string
  cns?: string
}

export type AddressContactStepValues = {
  postalCode: string
  street: string
  streetNumber: string
  addressComplement?: string
  district: string
  city: string
  state: string
  mobilePhone: string
  phoneSecondary?: string
  phoneIsWhatsapp?: boolean
}

export type OnboardingProfileFormValues = ProfileStepValues & AddressContactStepValues
