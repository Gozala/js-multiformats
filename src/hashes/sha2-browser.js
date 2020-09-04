// @ts-check

import { Hasher } from './hasher.js'

const sha = name =>
  async data => new Uint8Array(await window.crypto.subtle.digest(name, data))

export const sha256 = Hasher.from({
  name: 'sha2-256',
  code: 0x12,
  encode: sha('SHA-256')
})

export const sha512 = Hasher.from({
  name: 'sha2-512',
  code: 0x13,
  encode: sha('SHA-512')
})

export const __browser = true
