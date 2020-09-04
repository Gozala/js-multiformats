
// # SoleBase

/**
 * Interface implemented by arbitrary base encoders like base32 or base58btc.
 */
export interface BaseEncoder {
  /**
   * Name of the encoding.
   */
  name: string
  prefix: string

  /**
   * Encodes binary data into base encoded string.
   */
  encode(bytes: Uint8Array): string
}

/**
 * Interface implemented by arbitrary base decoder like base32 or base58btc.
 */
export interface BaseDecoder {
  decode(text: string): Uint8Array
}

/**
 * In practice (at least currently) bases are both encoders and decoders,
 * however it is useful to separate those capabilities as senders would
 * need encoder capability and receiver would need decoder capability.
 */
export interface BaseCodec extends BaseEncoder, BaseDecoder { }


// # Multibase


// Multibase encoder seems redundant, because it needs to be provided a base
// encoder and at that point it could just do `base.encode(data)`
export interface MultibaseEncoder {
  encode(bytes: Uint8Array, base: BaseEncoder): string
}

// Multibase decoder is API compatible with sole base decoder. Conceptually
// it is a composite base decoder that delegates to a base decoder based on
// prefix. That is to suggest that `MultibaseDecoder` is also redundant.
export interface MultibaseDecoder extends BaseDecoder {
}

// # Multihash

/**
 * Represents a multihash digest which carries information about the
 * hashing alogrithm and an actual hash digest.
 */
// Note: In the current version there is no first class multihash
// representation (plain Uint8Array is used instead) instead there seems to be
// a bunch of places that parse it to extract (code, digest, size). By creating
// this first class representation we avoid reparsing and things generally fit
// really nicely.
declare class MultihashDigest {
  /**
   * Turns bytes representation of multihash digest into an instance.
   */
  static from(bytes: Uint8Array): MultihashDigest

  /**
   * Creates a multihash digest.
   */
  constructor(code: number, digest: Uint8Array)

  /**
   * Code of the multihash
   */
  code: number

  /**
   * Raw digest (without a hashing algorithm info)
   */
  digest: Uint8Array

  /**
   * byte length of the `this.digest`
   */
  size: number

  /**
   * Binary representation of the this multihash digest.
   */
  bytes: Uint8Array[]
}


/**
 * Hasher represents a hashing algorithm implementation that produces as
 * `MultihashDigest`.
 */
interface Hasher {
  /**
   * Takes binary `input` and returns it (multi) hash digest.
   * @param {Uint8Array} input
   */
  digest(input: Uint8Array): MultihashDigest
}


// This is now redundant because one could just do `hasher.digest(input)`
// instead.
interface Multihash {
  digest(input: Uint8Array, hasher: Hasher): MultihashDigest
}


// # IPLD Codec

/**
 * IPLD encoder part of the codec.
 */
export interface Encoder<T> {
  name: string
  code: number
  encode(data: T): Uint8Array
}

/**
 * IPLD decoder part of the codec.
 */
export interface Decoder<T> {
  decode(bytes: Uint8Array): T
}

/**
 * IPLD codec that is just Encoder + Decoder however it is
 * separate those capabilties as sender requires encoder and receiver
 * requires decoder.
 */
export interface Codec<T> extends Encoder<T>, Decoder<T> { }


// This now also looks redundant because one could do `encoder.encode(value)`
// and `decoder.decode(value)` without this inderection.
export interface Multicodec {
  encode<T>(value: T, encoder: Encoder<T>): Uint8Array
  decode<T>(bytes: Uint8Array, decoder: Decoder<T>): T
}


// CID



declare class CID implements CID {
  // Data representation of the CID.
  code: number
  version: number
  multihash: MultihashDigest
  bytes: Uint8Array

  /**
   * Serializes this CID with provided base encoder. If not provided uses base
   * encoder this CID was suplied during instantiation.
   */
  toString(base?: BaseEncoder): string


  // Create in addition takes `base` parameter so that it can be used for
  // string serialization.
  static create(version: number, code: number, digest: MultihashDigest, base: BaseEncoder): DecodedCID

  // This is replacing `CID.from('QmHash')` which requires multibase registry
  // that will have to contain base (decoder) that cid was encoded with (which
  // it could be missing). All this introduces a lot of incidental complexity
  // that can be removed by separating concerns.
  /**
   * Takes cid string representation and a base decoder that supports that
   * encoding (it could be a sole decoder like like `base32` or composite
   * multi decoder like `multibase([base32, base56btc, ....])`).
   *
   * Throws if base  encoding is not supported by supplied `base` decoder.
   */
  static parse(cid: string, base: BaseDecoder): ParsedCID

  /**
   * Takes cid in a binary representation and a `base` encoder that will be used
   * for default cid serialization.
   *
   * Throws if non `base56btc` encoder is supplied with CID V0.
   */
  static decode(cid: Uint8Array, base: BaseEncoder): DecodedCID

  /**
   * Creates CID from a binary representation.
   */
  // 💣💣💣💣💣💣💣💣💣
  // This method is problematic because there is no information about base
  // encoding to be used by `this.toString()`.
  // 
  // I think there are following options to resolve this without having to
  // resort to register bound CID classes:
  //
  // 1. Bundle additional subclasses e.g. `Base32CID` and `Base58btcCID` (with
  //    corresponding base encoders bounded) so that `CID.from(new Uint8Array(...))`
  //    is able to can return either one or the other depending on cid version.
  //    `DefaultCID` illustrates implementation of that option.
  //
  // 2. Let `CID.from(new Uint8Array(...)).toString()` throw with no default
  //    base encoder error. Addition we could expose `Base32CID`,
  //    `Base56btcCID`, `DefaultCID` classes (as illustrated below) so that
  //    users can turn bytes into CID into a chosen base encoding.
  //
  // 3. Remove `CID.from` all together and have them on base specific subclasses
  //    like `Base32CID`, `DefaultCID` instead. This way `cid.toString()` will
  //    never throw as it would be impossible to create one without encoder.
  // 
  //    Note that we could still have something like `multiformats.cid(value)`
  //    where (value:Uint8Array|string|CID) to allow a registry approach when
  //    and if it is more convenient. Benefit is that other libs will be able
  //    to interop with CIDs returned by multibase without having to pull it in
  //    or be constrained by dependecy injection.
  // 
  // 4. Remove `CID.from(bytes:Uint8Array)` in favour of
  //    `CID.decode(bytes:Uint8Array, base:BaseEncoder)` so that user has to
  //    specificy default base.
  static from(cid: Uint8Array): CID


  // If another CID instance is provided just creates a clone. If we remove all
  // the other forms of `CID.from` this we should probably get rid of this one
  // as well. If functionality is needed we could add `.clone()` method instead.
  static from(cid: CID): CID
}


// This is just an illustrates how `CID.from(cid:Uint8Array)` could be
// implemented if `base32` and `base56btc` encoding were bundled with it.
class DefaultCID extends class CID {
  static from(cid) {
    if (cid instanceof Uint8Array) {
      const [version, offset] = varint.decode(bytes)
      switch (version) {
        case 18: {
          const multihash = new ImplicitSha256Digest(0x12, bytes)
          return CID.create(0, 0x70, multihash, base58btc)
        }
        case 1: {
          const [code, length] = varint.decode(bytes.subarray(offset))
          const multihash = MultihashDigest.from(bytes.subarray(offset + length))
          return CID.create(1, code, multihash, base32)
        }
        default: {
          throw new RangeError(`Invalid CID version ${version}`)
        }
      }
    } else {
      return CID.from(cid)
    }
  }
}

// Because CIDv0 does not really use multihash but rather a plain sha256 hash
// digest we define this implicit sha256 digest to represent it.
class ImplicitSha256Digest extends MultihashDigest {
    constructor(code: number, digest: Uint8Array)
    this.digest = digest
    this.bytes = digest
    this.code = code
    this.size = 32
  }
}

// Just an illustration of a CID bound to base58btc base.
class Base58btcCID extends CID {
  toString(base = base58btc) {
    return base.encode(this.bytes)
  }
}

// Just an illustration of a CID bound to a base32 base.
class Base32CID extends CID {
  toString(base = base32) {
    if (this.version === 0 && base.name !== 'base58btc') {
      throw new Error(`Cannot string encode V0 in ${base.name} encoding`)
    } else {
      return base.encode(this.bytes)
    }
  }
}


// I do not think we need this subclass, but it is useful for illustration
// purposes.
class DecodedCID extends CID {
  // When CID is created from binary data by calling `CID.create` or
  // `CID.decode` it needs to hold a reference to a `BaseEncoder` instance
  // so that it could be used by `toString()` when `base` isn't suppiled.
  private base: BaseDecoder

  toString(base = this.base) {
    if (this.version === 0 && base.name !== 'base58btc') {
      throw new Error(`Cannot string encode V0 in ${base.name} encoding`)
    } else {
      return base.encode(this.bytes)
    }
  }
}

// I do not think we do need this subclass, but it is useful for illustration
// purposes.
class ParsedCID extends CID {
  // When CID is parsed from string it does not need a `BaseEncoader` to provide
  // `toString()` implementation, because original string representation can be
  // retained.
  private asString: string

  toString(base) {
    if (base == null) {
      return this.asString
    } else if (this.version === 0) {
      if (base.name !== 'base58btc') {
        throw new Error(`Cannot string encode V0 in ${base.name} encoding`)
      } else {
        // no need to encode again since for version 0 we're guaranteed
        // to have base58btc
        return this.asString
      }
    } else {
      return base.encode(this.bytes)
    }
  }
}


// Block

// Just a representation for awaitable `T`.
export type Awaitable<T> =
  | T
  | Promise<T>


export interface Block {
  cid(): Awaitable<CID>
  encode(): Awaitable<Uint8Array>
}

export interface BlockEncoder {
  encode<T>(value: T, codec: Encoder<T>, options?: EncodeOptions): Block
}

interface EncodeOptions {
  /**
   * Multihasher to be use for the CID of the block. Will use a default
   * if not provided.
   */
  hasher?: Hasher
  /**
   * Base encoder that will be passed by the CID of the block.
   * Default is used if omitted.
   */
  base?: BaseEncoder
}



export interface BlockDecoder {
  decode<T>(block: Uint8Array, codec: Decoder<T>, options?: DecodeOptions): Block
}

interface DecodeOptions {
  /**
   * Multihasher to be use for the CID of the block. Will use a default
   * if not provided.
   */
  hasher?: Hasher

  /**
   * Base encoder that will be passed by the CID of the block.
   * Default is used if omitted.
   */
  base?: BaseEncoder
}

interface BlockAPI extends BlockDecoder, BlockDecoder {

}