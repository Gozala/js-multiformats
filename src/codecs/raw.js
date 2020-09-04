// @ts-check

import { coerce } from '../bytes.js'
import { Codec } from './codec.js'

/**
 * @param {Uint8Array} bytes
 * @returns {Uint8Array}
 */
const raw = (bytes) => coerce(bytes)

export default Codec.from({
  name: 'raw',
  code: 85,
  decode: raw,
  encode: raw
})
