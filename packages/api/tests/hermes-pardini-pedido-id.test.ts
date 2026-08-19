import { describe, expect, it } from 'vitest'
import {
  formatHermesPardiniCompoundPortalOrderId,
  formatHermesPardiniPedidoDisplayId,
  hermesPardiniPedidoApiId,
  hermesPardiniPedidoDisplayFromPedido,
} from '../src/infrastructure/scraper/hermes-pardini-pedido-id.js'

describe('hermes-pardini-pedido-id', () => {
  it('uses idPedido for API routes when both ids exist', () => {
    const pedido = { idPedido: '34||2026||1244885', numeroPedido: '1244885-34' }
    expect(hermesPardiniPedidoApiId(pedido)).toBe('34||2026||1244885')
    expect(hermesPardiniPedidoDisplayFromPedido(pedido)).toBe('1244885-34')
  })

  it('formats compound id when numeroPedido is missing', () => {
    expect(formatHermesPardiniCompoundPortalOrderId('34||2026||1244885')).toBe('1244885-34')
    expect(formatHermesPardiniPedidoDisplayId('34||2026||1244885')).toBe('1244885-34')
  })

  it('keeps plain ids unchanged', () => {
    expect(formatHermesPardiniCompoundPortalOrderId('101')).toBe('101')
    expect(formatHermesPardiniPedidoDisplayId('101', '1244885-34')).toBe('1244885-34')
  })
})
