export const INSURANCE_PORTALS = new Set(['unimed', 'amil', 'bradesco_saude'])

export function formatCpf(cpf: string | null | undefined): string {
  if (!cpf || cpf.length !== 11) return cpf || '—'
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
}

export function formatCns(cns: string | null | undefined): string {
  if (!cns) return '—'
  const d = cns.replace(/\D/g, '')
  if (d.length !== 15) return cns
  return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7, 11)} ${d.slice(11)}`
}

export function formatCardNumber(value: string | null | undefined): string | null {
  if (!value) return null
  return value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim()
}

export type WalletBrandKey = 'unimed' | 'amil' | 'bradesco_saude' | 'conectesus' | 'caderneta' | string

export interface WalletBrandMeta {
  label: string
  subtitle: string
  headerBg: string
  bodyBg: string
  textColor: string
  mutedColor: string
}

const BRANDS: Record<string, WalletBrandMeta> = {
  unimed: {
    label: 'Unimed BH',
    subtitle: 'Cooperativa de saúde',
    headerBg: '#00995d',
    bodyBg: '#007a52',
    textColor: '#ffffff',
    mutedColor: '#b8f5e0',
  },
  amil: {
    label: 'Amil',
    subtitle: 'Plano de saúde',
    headerBg: '#4F14FF',
    bodyBg: '#5b6fd6',
    textColor: '#ffffff',
    mutedColor: '#e8ecff',
  },
  bradesco_saude: {
    label: 'Bradesco Saúde',
    subtitle: 'Plano de saúde',
    headerBg: '#cc092f',
    bodyBg: '#a00820',
    textColor: '#ffffff',
    mutedColor: '#ffd6d6',
  },
  conectesus: {
    label: 'Cartão Nacional de Saúde',
    subtitle: 'ConecteSUS',
    headerBg: '#f5f8fc',
    bodyBg: '#eef3f8',
    textColor: '#1e293b',
    mutedColor: '#00599c',
  },
  caderneta: {
    label: 'Caderneta da criança',
    subtitle: 'Ministério da Saúde',
    headerBg: '#0d9488',
    bodyBg: '#0f766e',
    textColor: '#ffffff',
    mutedColor: '#ccfbf1',
  },
}

export function walletBrandMeta(brandKey: WalletBrandKey): WalletBrandMeta {
  return (
    BRANDS[brandKey] ?? {
      label: String(brandKey).replace(/_/g, ' '),
      subtitle: 'Cartão',
      headerBg: '#64748b',
      bodyBg: '#475569',
      textColor: '#ffffff',
      mutedColor: '#e2e8f0',
    }
  )
}
