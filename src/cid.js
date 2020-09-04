// @ts-check

import varint from './varint.js'
import { base58btc, base32 } from './bases/base.js'
import { Digest, ImplicitSha256Digest } from './hashes/hasher.js'
import { multibaseDecoder as defaultBaseDecoder } from './multibase.js'

/**
 * @typedef {import('./hashes/interface').MultihashDigest} MultihashDigest
 * @typedef {import('./bases/interface').BaseEncoder} BaseEncoder
 * @typedef {import('./bases/interface').BaseDecoder} BaseDecoder
 */

export class CID {
  /**
   * @protected
   * @param {number} version
   * @param {number} code
   * @param {MultihashDigest} multihash
   * @param {Uint8Array} bytes
   * @param {BaseEncoder} base
   */
  constructor (version, code, multihash, bytes, base) {
    this.code = code
    this.version = version
    this.multihash = multihash
    this.bytes = bytes
    this.base = base

    // ArrayBufferView
    this.byteOffset = bytes.byteOffset
    this.byteLength = bytes.byteLength

    // Circular reference
    /** @private */
    this.asCID = this
    /**
     * @type {Map<string, string>}
     * @private
     */
    this._baseCache = new Map()

    // Configure private properties
    Object.defineProperties(this, {
      byteOffset: hidden,
      byteLength: hidden,

      code: readonly,
      version: readonly,
      multihash: readonly,
      bytes: readonly,

      _baseCache: hidden,
      asCID: hidden
    })
  }

  /**
   *
   * @param {number} version
   * @param {number} code
   * @param {MultihashDigest} digest
   * @param {BaseEncoder} base
   */
  static create (version, code, digest, base) {
    switch (version) {
      case 0: {
        if (code !== DAG_PB_CODE) {
          throw new Error(`Version 0 CID must use dag-pb (code: ${DAG_PB_CODE}) block encoding`)
        } else if (base.name !== BASE_58_BTC) {
          throw new Error(`Version 0 CID must use base58btc (code: ${BASE_58_BTC}) base encoding`)
        } else {
          return new CID(version, code, digest, digest.bytes, base)
        }
      }
      case 1: {
        const bytes = encodeCID(version, code, digest.bytes)
        return new CID(version, code, digest, bytes, base)
      }
      default: {
        throw new Error('Invalid version')
      }
    }
  }

  /**
   * @param {MultihashDigest} digest
   */
  static createV0 (digest) {
    const version = 0
    const code = DAG_PB_CODE
    const bytes = encodeCID(version, code, digest.bytes)
    return new CID(version, code, digest, bytes, base58btc)
  }

  /**
   * @template {number} Code
   * @param {Code} code
   * @param {MultihashDigest} digest
   * @param {BaseEncoder} base
   */
  static createV1 (code, digest, base = base32) {
    const version = 1
    const bytes = encodeCID(version, code, digest.bytes)
    return new CID(version, code, digest, bytes, base32)
  }

  /**
   * Creates new CID from the given value that is either CID, string or an
   * Uint8Array.
   * @param {CID|string|Uint8Array} value
   */
  static from (value) {
    if (typeof value === 'string') {
      return this.parse(value)
    } else if (value instanceof Uint8Array) {
      return this.decode(value)
    } else {
      const cid = CID.asCID(value)
      if (cid) {
        // If we got the same CID back we create a copy.
        if (cid === value) {
          return new CID(cid.version, cid.code, cid.multihash, cid.bytes, cid.base)
        } else {
          return cid
        }
      } else {
        throw new TypeError(`Can not create CID from given value ${value}`)
      }
    }
  }

  // This is replacing `CID.from('QmHash')` which requires multibase registry
  // that will have to contain base (decoder) that cid was encoded with (which
  // it could be missing). All this introduces a lot of incidental complexity
  // that can be removed by separating concerns.
  /**
   * Takes cid in a string representation and an optional `base` decoder for
   * it's base encoding (could be sole decoder like `base32` or composite like
   * `multibase([base32, base58btc])`) and returns a CID instance for it.
   *
   * encoding (it could be a sole decoder like like `base32` or composite
   * multi decoder like `multibase([base32, base56btc, ....])`).
   *
   * Throws if base  encoding is not supported by supplied `base` decoder.
   * @param {string} cid
   * @param {BaseDecoder} [base]
   */
  static parse (cid, base = defaultBaseDecoder) {
    const instance = this.decode(base.decode(cid))
    // Cache string representation to avoid computing it on `this.toString()`
    instance._baseCache.set(instance.base.name, cid)
    return instance
  }

  /**
   * Takes cid in a binary representation and a `base` encoder that will be used
   * for default cid serialization.
   *
   * Throws if non `base56btc` encoder is supplied with CID V0.
   * @param {Uint8Array} cid
   * @param {BaseEncoder} [base]
   */
  static decode (cid, base) {
    const [version, offset] = varint.decode(cid)
    switch (version) {
      // CIDv0
      case 18: {
        const digest = ImplicitSha256Digest.decode(cid)
        return CID.create(0, DAG_PB_CODE, digest, base || base58btc)
      }
      // CIDv1
      case 1: {
        const [code, length] = varint.decode(cid.subarray(offset))
        const digest = Digest.decode(cid.subarray(offset + length))
        return CID.createV1(code, digest, base)
      }
      default: {
        throw new RangeError(`Invalid CID version ${version}`)
      }
    }
  }

  /**
     * Takes any input `value` and returns a `CID` instance if it was
     * a `CID` otherwise returns `null`. If `value` is instanceof `CID`
     * it will return value back. If `value` is not instance of this CID
     * class, but is compatible CID it will return new instance of this
     * `CID` class. Otherwise returs null.
     *
     * This allows two different incompatible versions of CID library to
     * co-exist and interop as long as binary interface is compatible.
     * @param {any} value
     * @returns {CID|null}
     */
  static asCID (value) {
    // If value is instance of CID then we're all set.
    if (value instanceof CID) {
      return value
      // If value isn't instance of this CID class but `this.asCID === this` is
      // true it is CID instance coming from a different implemnetation (diff
      // version or duplicate). In that case we rebase it to this `CID`
      // implemnetation so caller is guaranteed to get instance with expected
      // API.
    } else if (value != null && value.asCID === value) {
      const { version, code, multihash, bytes, base } = value
      return new CID(version, code, multihash, bytes, base)
      // If value is a CID from older implementation that used to be tagged via
      // symbol we still rebase it to the this `CID` implementation by
      // delegating that to a constructor.
    } else if (value != null && value[cidSymbol] === true) {
      const { version, multihash, code, base } = value
      const digest = multihash instanceof Uint8Array
        ? version === 0 ? ImplicitSha256Digest.decode(multihash) : Digest.decode(multihash)
        : multihash
      const defaultBase = base || (version === 0 ? base58btc : base32)
      return new CID(version, code, digest, digest.bytes, defaultBase)
      // Otherwise value is not a CID (or an incompatible version of it) in
      // which case we return `null`.
    } else {
      return null
    }
  }

  toV0 () {
    switch (this.version) {
      case 0: {
        return this
      }
      default: {
        if (this.code !== DAG_PB_CODE) {
          throw new Error('Cannot convert a non dag-pb CID to CIDv0')
        }

        const { code, digest } = this.multihash

        // sha2-256
        if (code !== SHA_256_CODE) {
          throw new Error('Cannot convert non sha2-256 multihash CID to CIDv0')
        }

        return CID.createV0(ImplicitSha256Digest.decode(digest))
      }
    }
  }

  toV1 () {
    switch (this.version) {
      case 0: {
        const { code, digest } = this.multihash
        const multihash = Digest.create(code, digest)
        return CID.createV1(this.code, multihash, this.base)
      }
      case 1: {
        return this
      }
      default: {
        throw Error(`Can not convert CID version ${this.version} to version 0. This is a bug please report`)
      }
    }
  }

  /**
   * @param {any} other
   */
  equals (other) {
    return other &&
        this.code === other.code &&
        this.version === other.version &&
        Digest.equals(this.multihash, other.multihash)
  }

  /**
   * @param {BaseEncoder} [base]
   */
  toString (base) {
    const { version, bytes, _baseCache } = this
    switch (version) {
      case 0: {
        const encoder = base || base58btc
        if (encoder.name !== BASE_58_BTC) {
          throw new Error(`Cannot string encode V0 in ${base.name} encoding`)
        }

        return serializeAndCache(_baseCache, bytes, encoder)
      }
      default: {
        return serializeAndCache(_baseCache, bytes, base || base32)
      }
    }
  }

  toJSON () {
    return {
      code: this.code,
      version: this.version,
      hash: this.multihash.bytes
    }
  }

  get [Symbol.toStringTag] () {
    return 'CID'
  }

  // Legacy

  [Symbol.for('nodejs.util.inspect.custom')] () {
    return 'CID(' + this.toString() + ')'
  }

  // Deprecated

  static isCID (value) {
    deprecate(/^0\.0/, IS_CID_DEPRECATION)
    return !!(value && (value[cidSymbol] || value.asCID === value))
  }

  get toBaseEncodedString () {
    throw new Error('Deprecated, use .toString()')
  }

  get codec () {
    throw new Error('"codec" property is deprecated, use integer "code" property instead')
  }

  get buffer () {
    throw new Error('Deprecated .buffer property, use .bytes to get Uint8Array instead')
  }

  get multibaseName () {
    throw new Error('"multibaseName" property is deprecated')
  }

  get prefix () {
    throw new Error('"prefix" property is deprecated')
  }
}

const serializeAndCache = (cache, bytes, base) => {
  const text = cache.get(base)
  if (text == null) {
    const text = base.encode(bytes)
    cache.set(base, text)
    return text
  } else {
    return text
  }
}

const BASE_58_BTC = 'base58btc'
const DAG_PB_CODE = 0x70
const SHA_256_CODE = 0x12

/**
     *
 * @param {number} version
 * @param {number} code
 * @param {Uint8Array} multihash
 * @returns {Uint8Array}
 */
const encodeCID = (version, code, multihash) => {
  const codeOffset = varint.encodingLength(version)
  const hashOffset = codeOffset + varint.encodingLength(code)
  const bytes = new Uint8Array(hashOffset + multihash.byteLength)
  varint.encodeTo(version, bytes, 0)
  varint.encodeTo(code, bytes, codeOffset)
  bytes.set(multihash, hashOffset)
  return bytes
}

const cidSymbol = Symbol.for('@ipld/js-cid/CID')
const readonly = { writable: false, configurable: false, enumerable: true }
const hidden = { writable: false, enumerable: false, configurable: false }

// ESM does not support importing package.json where this version info
// should come from. To workaround it version is copied here.
const version = '0.0.0-dev'
// Start throwing exceptions on major version bump
const deprecate = (range, message) => {
  if (range.test(version)) {
    console.warn(message)
  /* c8 ignore next 3 */
  } else {
    throw new Error(message)
  }
}

const IS_CID_DEPRECATION =
`CID.isCID(v) is deprecated and will be removed in the next major release.
Following code pattern:

if (CID.isCID(value)) {
  doSomethingWithCID(value)
}

Is replaced with:

const cid = CID.asCID(value)
if (cid) {
  // Make sure to use cid instead of value
  doSomethingWithCID(cid)
}
`
