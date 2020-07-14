import * as bytes from './bytes.js'

const readonly = (object, key, value) => {
  Object.defineProperty(object, key, {
    value,
    writable: false,
    enumerable: true
  })
}

// ESM does not support importing package.json where this version info
// should come from. To workaround it version is copied here.
const version = '0.0.0-dev'
// Start throwing exceptions on major version bump
const deprecate = (range, message) => {
  if (range.test(version)) {
    console.warn(message)
  } else {
    throw new Error(message)
  }
}

export default multiformats => {
  const { multibase, varint, multihash } = multiformats
  const parse = buff => {
    const [code, length] = varint.decode(buff)
    return [code, buff.slice(length)]
  }
  const encode = (version, codec, multihash) => {
    return Uint8Array.from([
      ...varint.encode(version),
      ...varint.encode(codec),
      ...multihash
    ])
  }

  const cidSymbol = Symbol.for('@ipld/js-cid/CID')

  class CID {
    constructor (cid, ...args) {
      Object.defineProperty(this, '_baseCache', {
        value: new Map(),
        writable: false,
        enumerable: false
      })
      readonly(this, 'asCID', this)
      if (CID.isCID(cid)) {
        readonly(this, 'version', cid.version)
        readonly(this, 'multihash', bytes.coerce(cid.multihash))
        readonly(this, 'buffer', bytes.coerce(cid.buffer))
        if (cid.code) readonly(this, 'code', cid.code)
        else readonly(this, 'code', multiformats.get(cid.codec).code)
        return
      }
      if (args.length > 0) {
        if (typeof args[0] !== 'number') throw new Error('String codecs are no longer supported')
        readonly(this, 'version', cid)
        readonly(this, 'code', args.shift())
        if (this.version === 0 && this.code !== 112) {
          throw new Error('Version 0 CID must be 112 codec (dag-cbor)')
        }
        this._multihash = args.shift()
        if (args.length) throw new Error('No longer supported, cannot specify base encoding in instantiation')
        if (this.version === 0) readonly(this, 'buffer', this.multihash)
        else readonly(this, 'buffer', encode(this.version, this.code, this.multihash))
        return
      }
      if (typeof cid === 'string') {
        if (cid.startsWith('Q')) {
          readonly(this, 'version', 0)
          readonly(this, 'code', 0x70)
          const { decode } = multibase.get('base58btc')
          this._multihash = decode(cid)
          readonly(this, 'buffer', this.multihash)
          return
        }
        const { name } = multibase.encoding(cid)
        this._baseCache.set(name, cid)
        cid = multibase.decode(cid)
      }
      cid = bytes.coerce(cid)
      readonly(this, 'buffer', cid)
      let code
      ;[code, cid] = parse(cid)
      if (code > 1) throw new Error(`Invalid CID version ${code}`)
      readonly(this, 'version', code)
      ;[code, cid] = parse(cid)
      readonly(this, 'code', code)
      this._multihash = cid
    }

    set _multihash (hash) {
      const { length, digest } = multihash.decode(hash)
      if (digest.length !== length) throw new Error('Incorrect length')
      readonly(this, 'multihash', hash)
    }

    get codec () {
      throw new Error('"codec" property is deprecated, use integer "code" property instead')
    }

    get multibaseName () {
      throw new Error('"multibaseName" property is deprecated')
    }

    get prefix () {
      throw new Error('"prefix" property is deprecated')
    }

    toV0 () {
      if (this.code !== 0x70 /* dag-pb */) {
        throw new Error('Cannot convert a non dag-pb CID to CIDv0')
      }

      const { name } = multihash.decode(this.multihash)

      if (name !== 'sha2-256') {
        throw new Error('Cannot convert non sha2-256 multihash CID to CIDv0')
      }

      return new CID(0, this.code, this.multihash)
    }

    toV1 () {
      return new CID(1, this.code, this.multihash)
    }

    get toBaseEncodedString () {
      throw new Error('Deprecated, use .toString()')
    }

    [Symbol.for('nodejs.util.inspect.custom')] () {
      return 'CID(' + this.toString() + ')'
    }

    toString (base) {
      if (this.version === 0) {
        if (base && base !== 'base58btc') {
          throw new Error(`Cannot string encode V0 in ${base} encoding`)
        }
        const { encode } = multibase.get('base58btc')
        return encode(this.buffer)
      }
      if (!base) base = 'base32'
      if (this._baseCache.has(base)) return this._baseCache.get(base)
      this._baseCache.set(base, multibase.encode(this.buffer, base))
      return this._baseCache.get(base)
    }

    toJSON () {
      return {
        code: this.code,
        version: this.version,
        hash: this.multihash
      }
    }

    equals (other) {
      return this.code === other.code &&
        this.version === other.version &&
        bytes.equals(this.multihash, other.multihash)
    }

    get [Symbol.toStringTag] () {
      return 'CID'
    }

    get [cidSymbol] () {
      return true
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
      if (value instanceof CID) {
        return value
      } else if (value != null && value.asCID === value) {
        const { version, code, multihash } = value
        return new CID(version, code, multihash)
      } else {
        return null
      }
    }

    static isCID (value) {
      deprecate(/^0\.0/, `CID.isCID(v) is deprecated and will be removed in the next major release.
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
`)
      return !!(value && value[cidSymbol])
    }
  }

  return CID
}
