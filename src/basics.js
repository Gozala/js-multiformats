
import * as base32 from './bases/base32.js'
import * as sha2 from './hashes/sha2.js'

import raw from './codecs/raw.js'
import json from './codecs/json.js'
import { CID } from './index.js'

export const bases = { ...base32 }
export const hashes = { ...sha2 }
export const codecs = { raw, json }

export { CID }
