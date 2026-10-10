import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './passwords.js'

describe('hashPassword', () => {
  it('produces a self-describing scrypt hash', async () => {
    const hash = await hashPassword('correct horse battery staple')
    const [scheme, n, r, p, salt, key] = hash.split('$')
    expect(scheme).toBe('scrypt')
    expect(Number(n)).toBe(16384)
    expect(Number(r)).toBe(8)
    expect(Number(p)).toBe(1)
    expect(Buffer.from(salt!, 'base64')).toHaveLength(16)
    expect(Buffer.from(key!, 'base64')).toHaveLength(64)
  })

  it('salts each call so identical passwords differ', async () => {
    const a = await hashPassword('same-password')
    const b = await hashPassword('same-password')
    expect(a).not.toBe(b)
  })

  it('never stores the plaintext', async () => {
    const hash = await hashPassword('plaintext-should-not-appear')
    expect(hash).not.toContain('plaintext-should-not-appear')
  })

  it('normalises unicode so visually identical passwords match', async () => {
    const composed = 'café'
    const decomposed = 'café'
    const hash = await hashPassword(composed)
    expect(await verifyPassword(decomposed, hash)).toBe(true)
  })
})

describe('verifyPassword', () => {
  it('accepts the correct password', async () => {
    const hash = await hashPassword('s3cret-passphrase')
    expect(await verifyPassword('s3cret-passphrase', hash)).toBe(true)
  })

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('s3cret-passphrase')
    expect(await verifyPassword('s3cret-passphraseX', hash)).toBe(false)
  })

  it('rejects an empty stored value', async () => {
    expect(await verifyPassword('anything', '')).toBe(false)
  })

  it.each([
    ['plaintext', 'not-a-hash'],
    ['wrong segment count', 'scrypt$16384$8$salt$key'],
    ['unknown scheme', 'bcrypt$16384$8$1$c2FsdA==$a2V5'],
    ['empty key', 'scrypt$16384$8$1$c2FsdA=='],
  ])('rejects %s', async (_label, stored) => {
    expect(await verifyPassword('anything', stored)).toBe(false)
  })

  it('does not throw on a truncated or malformed key', async () => {
    expect(await verifyPassword('anything', 'scrypt$16384$8$1$!!!not-base64!!!$@@@')).toBe(false)
  })
})