/** CPF obrigatório no perfil titular (`membership` role `self`) após onboarding. */
export function isValidSelfProfileCpf(cpf: string | null | undefined): boolean {
  return typeof cpf === 'string' && /^\d{11}$/.test(cpf)
}

export const SELF_PROFILE_CPF_REQUIRED_MESSAGE =
  'CPF é obrigatório para o perfil titular da conta.'
