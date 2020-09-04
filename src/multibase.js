// @ts-check
import { base32, base58btc } from './bases/base.js'

const empty = new Uint8Array(0)
export const multibaseDecoder = {
  /**
   * @param {string} input
   * @returns {Uint8Array}
   */
  decode (input) {
    if (typeof input !== 'string') {
      throw new Error('Can only multibase decode strings')
    }

    if (input.length <= 1) {
      return empty
    }

    switch (input[0]) {
      case base32.prefix:
        return base32.decode(input)
      case base58btc.prefix:
        return base58btc.decode(input)
      default: {
        throw new Error(`base decoder for "${input}" is found, please use specific decoder instead`)
      }
    }
  }

}
