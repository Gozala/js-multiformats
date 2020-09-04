// @ts-check

import baseX from 'base-x'
import { coerce } from '../bytes.js'
import { Buffer } from 'buffer'
import { Codec, base58btc as btc, base58flickr as flickr } from './base.js'

/**
 * @param {ArrayBufferView} bytes
 * @returns {Buffer}
 */
const asBufferView = (bytes) => {
  if (bytes instanceof Buffer) {
    return bytes
  } else {
    return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }
}

/**
 * @template {string} Base
 * @template {string} Prefix
 * @param {Codec<Base, Prefix>} codec
 * @param {string} alphabet
 */
const implement = (codec, alphabet) => {
  const base = baseX(alphabet)
  return Codec.implement(codec, {
    encode: bytes => base.encode(asBufferView(bytes)),
    decode: text => coerce(base.decode(text))
  })
}

export const base58btc = implement(btc, '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz')
export const base58flickr = implement(flickr, '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ')
