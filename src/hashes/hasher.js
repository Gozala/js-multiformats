// @ts-check

import { coerce, equals } from '../bytes.js'
import varint from '../varint.js'

/**
 * @typedef {import('./interface').MultihashDigest} MultihashDigest
 * @typedef {import('./interface').MultihashHasher} MultihashHasher
 */

/**
 * @template T
 * @typedef {Promise<T>|T} Await
 */

/**
 * Represents a multihash digest which carries information about the
 * hashing alogrithm and an actual hash digest.
 * @template {number} Code
 * @template {number} Size
 * @class
 * @implements {MultihashDigest}
 */
export class Digest {
  /**
   * Turns bytes representation of multihash digest into an instance.
   * @param {Uint8Array} multihash
   * @returns {Digest}
   */
  static decode (multihash) {
    const bytes = coerce(multihash)
    const [code, sizeOffset] = varint.decode(bytes)
    const [size, digestOffset] = varint.decode(bytes.subarray(sizeOffset))
    const digest = bytes.subarray(sizeOffset + digestOffset)

    if (digest.byteLength !== size) {
      throw new Error('Given multihash has incorrect length')
    }

    return new Digest(code, size, digest, bytes)
  }

  /**
   * Creates a multihash digest.
   * @template {number} Code
   * @param {Code} code
   * @param {Uint8Array} digest
   */
  static create (code, digest) {
    const size = digest.byteLength
    const sizeOffset = varint.encodingLength(code)
    const digestOffset = sizeOffset + varint.encodingLength(size)

    const bytes = new Uint8Array(digestOffset + size)
    varint.encodeTo(code, bytes, 0)
    varint.encodeTo(size, bytes, sizeOffset)
    bytes.set(digest, digestOffset)

    return new Digest(code, size, digest, bytes)
  }

  /**
   * Creates a multihash digest.
   * @param {Code} code
   * @param {Size} size
   * @param {Uint8Array} digest
   * @param {Uint8Array} bytes
   */
  constructor (code, size, digest, bytes) {
    this.code = code
    this.size = size
    this.digest = digest
    this.bytes = bytes
  }

  /**
   * @param {any} a
   * @param {any} b
   * @returns {boolean}
   */
  static equals (a, b) {
    if (a === b) {
      return true
    } else {
      const bytesA = a && a.bytes
      const bytesB = b && b.bytes
      return equals(bytesA, bytesB)
    }
  }
}

/**
 * Hasher represents a hashing algorithm implementation that produces as
 * `MultihashDigest`.
 *
 * @template {string} Name
 * @template {number} Code
 * @class
 * @implements {MultihashHasher}
 */
export class Hasher {
  /**
   * @template {string} Name
   * @template {number} Code
   * @param {Object} options
   * @param {Name} options.name
   * @param {Code} options.code
   * @param {(input: Uint8Array) => Await<Uint8Array>} options.encode
   */
  static from ({ name, code, encode }) {
    return new Hasher(name, code, encode)
  }

  /**
   *
   * @param {Name} name
   * @param {Code} code
   * @param {(input: Uint8Array) => Await<Uint8Array>} encode
   */
  constructor (name, code, encode) {
    this.name = name
    this.code = code
    this.encode = encode
  }

  /**
   * @param {Uint8Array} input
   * @returns {Promise<Digest>}
   */
  async digest (input) {
    const digest = await this.encode(input)
    return Digest.create(this.code, digest)
  }
}

/**
 * @class
 * @implements {MultihashDigest}
 * @extends {Digest<0x12, 32>}
 */
export class ImplicitSha256Digest extends Digest {
  /**
   * @private
   * @param {Uint8Array} digest
   */
  constructor (digest) {
    super(0x12, 32, digest, digest)
  }

  /**
   * Turns bytes representation of multihash digest into an instance.
   * @param {Uint8Array} hash
   */
  static decode (hash) {
    return new ImplicitSha256Digest(hash)
  }

  /**
   * @param {any} other
   * @returns {boolean}
   */
  equals (other) {
    return other &&
      other.digest instanceof Uint8Array &&
      equals(this.digest, other.digest)
  }
}
