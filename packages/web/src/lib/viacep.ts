export type ViaCepAddress = {
  postalCode: string
  street: string
  district: string
  city: string
  state: string
}

type ViaCepResponse = {
  erro?: boolean
  logradouro?: string
  bairro?: string
  localidade?: string
  uf?: string
}

/** Busca endereço por CEP (ViaCEP). Retorna null se CEP inválido ou não encontrado. */
export async function fetchAddressByCep(cepDigits: string): Promise<ViaCepAddress | null> {
  const cep = cepDigits.replace(/\D/g, '')
  if (cep.length !== 8) return null
  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
  if (!res.ok) return null
  const data = (await res.json()) as ViaCepResponse
  if (data.erro || !data.localidade || !data.uf) return null
  return {
    postalCode: cep,
    street: data.logradouro?.trim() || '',
    district: data.bairro?.trim() || '',
    city: data.localidade.trim(),
    state: data.uf.trim().toUpperCase(),
  }
}
