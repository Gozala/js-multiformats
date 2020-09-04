// @ts-check

import crypto from 'crypto'
import { Hasher } from './hasher.js'
import { coerce } from '../bytes.js'

export const sha256 = Hasher.from({
  name: 'sha2-256',
  code: 0x12,
  encode: (input) => coerce(crypto.createHash('sha256').update(input).digest())
})

export const sha512 = Hasher.from({
  name: 'sha2-512',
  code: 0x13,
  encode: input => coerce(crypto.createHash('sha512').update(input).digest())
})

export const __browser = false
