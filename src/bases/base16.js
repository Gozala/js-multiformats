// @ts-check

import { fromHex, toHex } from '../bytes.js'
import { base16 as codec, Codec } from './base.js'

export const base16 = Codec.implementWithAlphabet(codec, {
  alphabet: '0123456789abcdef',
  encode: toHex,
  decode: fromHex
})
