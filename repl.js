// /* eslint-disable no-unused-vars */

// import crypto from 'crypto'
// import OLDCID from 'cids'
// import assert from 'assert'
// import { toHex } from 'multiformats/bytes.js'
import * as multiformats from 'multiformats/basics'
// import base58 from 'multiformats/bases/base58.js'
// import base32 from 'multiformats/bases/base32.js'
// import base64 from 'multiformats/bases/base64.js'
// import util from 'util'

// import legacy from './legacy.js'

const main = async () => {
  console.log(multiformats)

  const bytes = multiformats.codecs.json.encode({ hello: 'world' })

  console.log(bytes)

  const data = multiformats.codecs.json.decode(bytes)

  console.log(data)

  //   const { multibase } = multiformats
  //   multibase.add(base58)
  //   multibase.add(base32)
  //   multibase.add(base64)

  //   const raw = legacy(multiformats, 'raw')
  //   const json = legacy(multiformats, 'json')

  //   const link = await raw.util.cid(Buffer.from('test'))

  //   multiformats.multicodec.add({
  //     name: 'custom',
  //     code: 6787678,
  //     encode: o => {
  //       if (o.link) {
  //         assert.ok(o.link.code)
  //         o.link = true
  //       }
  //       return json.util.serialize({ o, l: link.toString() })
  //     },
  //     decode: buff => {
  //       const obj = json.util.deserialize(buff)
  //       obj.l = link
  //       if (obj.o.link) obj.link = multiformats.CID.from(link)
  //       return obj
  //     }
  //   })

  //   const custom = legacy(multiformats, 'custom')

//   Object.assign(global, {
//     OLDCID,
//     legacy,
//     multiformats,
//     custom,
//     link,
//     raw,
//     json,
//     ...multiformats
//   })
}

main()
