// @ts-check

import { Codec } from './codec.js'

export default Codec.from({
  name: 'json',
  code: 0x0200,
  encode: obj => new TextEncoder().encode(JSON.stringify(obj)),
  decode: buff => JSON.parse(new TextDecoder().decode(buff))
})
