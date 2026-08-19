import { describe, expect, it } from 'vitest'
import {
  attachHermesPardiniDialogHandler,
  hermesPardiniBrowserHeadless,
  isHermesPardiniLoginUrl,
  pickHermesPardiniPedidosRequestHeaders,
} from '../src/infrastructure/scraper/hermes-pardini-login.helper.js'
import { hermesPardiniResultadosExameUrl } from '../src/infrastructure/scraper/hermes-pardini.portal.js'

describe('hermes-pardini-login.helper', () => {
  it('opens visible browser on interactive sync by default', () => {
    const prev = process.env.HERMES_PARDINI_HEADLESS
    delete process.env.HERMES_PARDINI_HEADLESS
    expect(hermesPardiniBrowserHeadless(true)).toBe(false)
    expect(hermesPardiniBrowserHeadless(false)).toBe(true)
    process.env.HERMES_PARDINI_HEADLESS = '0'
    expect(hermesPardiniBrowserHeadless(false)).toBe(false)
    process.env.HERMES_PARDINI_HEADLESS = '1'
    expect(hermesPardiniBrowserHeadless(true)).toBe(true)
    if (prev !== undefined) process.env.HERMES_PARDINI_HEADLESS = prev
    else delete process.env.HERMES_PARDINI_HEADLESS
  })

  it('copies browser pedidos headers without authorization', () => {
    const picked = pickHermesPardiniPedidosRequestHeaders({
      Authorization: 'Bearer secret',
      accept: 'application/json',
      referer: hermesPardiniResultadosExameUrl(),
      'marca-selecionada': 'pardini',
      'marca-origem': 'pardini',
      grupo: 'grupo-pardini',
      'sec-fetch-mode': 'cors',
      'user-agent': 'Mozilla/5.0',
      cookie: 'ignored',
    })
    expect(picked).toMatchObject({
      accept: 'application/json',
      referer: hermesPardiniResultadosExameUrl(),
      'marca-selecionada': 'pardini',
      'marca-origem': 'pardini',
      grupo: 'grupo-pardini',
    })
    expect(picked.Authorization).toBeUndefined()
    expect(picked.cookie).toBeUndefined()
    expect(picked['sec-fetch-mode']).toBeUndefined()
    expect(picked['user-agent']).toBeUndefined()
  })

  it('exports dialog handler for native alerts', () => {
    expect(typeof attachHermesPardiniDialogHandler).toBe('function')
  })

  it('detects Precision Care login shell URLs', () => {
    expect(isHermesPardiniLoginUrl('https://resultados.grupofleury.com.br/?origin=pardini')).toBe(true)
    expect(isHermesPardiniLoginUrl(
      'https://sso.grupofleury.com.br/auth/realms/grupopardini/protocol/openid-connect/auth',
    )).toBe(true)
    expect(isHermesPardiniLoginUrl(
      'https://resultados.grupofleury.com.br/pardini/portalpaciente/resultadosExame',
    )).toBe(false)
  })
})
