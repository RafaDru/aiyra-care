import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '../src/infrastructure/crypto-helper.js'

process.env.CRYPTO_KEY = 'd23612de135822a6d0aa8633b7fa01e7712da9616805ab896c0f1502d02149aa'

describe('crypto-helper', () => {
  it('encrypts and decrypts a password', () => {
    const password = 'minha-senha-secreta-123'
    const encrypted = encrypt(password)
    expect(encrypted).toBeTruthy()
    expect(encrypted).toContain(':')
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(password)
  })

  it('produces different ciphertext for same input', () => {
    const password = 'same-password'
    const a = encrypt(password)
    const b = encrypt(password)
    expect(a).not.toBe(b)
  })

  it('throws on invalid encrypted format', () => {
    expect(() => decrypt('invalid')).toThrow('Invalid encrypted format')
  })

  it('throws when CRYPTO_KEY is missing', () => {
    const key = process.env.CRYPTO_KEY
    delete process.env.CRYPTO_KEY
    expect(() => encrypt('test')).toThrow('CRYPTO_KEY')
    process.env.CRYPTO_KEY = key
  })
})
