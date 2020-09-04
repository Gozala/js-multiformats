
import { CID, hashes, codecs, bases as base } from './basics.js'
import * as base64 from './bases/base64-import.js'

export const bases = { ...base, ...base64 }
export { hashes, codecs, CID }
