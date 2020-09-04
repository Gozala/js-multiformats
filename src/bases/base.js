// @ts-check

/**
 * @typedef {import('./interface').BaseEncoder} BaseEncoder
 * @typedef {import('./interface').BaseDecoder} BaseDecoder
 * @typedef {import('./interface').BaseCodec} BaseCodec
 */

/**
 * @class
 * @implements {BaseEncoder}
 * @template {string} Base
 * @template {string} Prefix
 */
export class Encoder {
  /**
   * @param {Base} name
   * @param {Prefix} prefix
   */
  constructor (name, prefix) {
    this.name = name
    this.prefix = prefix
  }

  /**
   * @param {Uint8Array} input
   * @returns {string}
   */
  encode (input) {
    throw new Error(`${this.name} encoder is imported as placeholder, in order to encode implementation needs to be imported`)
  }
}

/**
 * @class
 * @implements {BaseDecoder}
 */
export class Decoder {
  /**
   * @param {string} name
   */
  constructor (name) {
    this.name = name
  }

  /**
   * @param {string} input
   * @returns {Uint8Array}
   */
  decode (input) {
    throw new Error(`${this.name} decoder is imported as placeholder, in order to decode implementation needs to be imported`)
  }
}

/**
 * @class
 * @implements {BaseCodec}
 * @template {string} Base
 * @template {string} Prefix
 */
export class Codec {
  /**
   * @private
   * @param {Base} name
   * @param {Prefix} prefix
   */
  constructor (name, prefix) {
    this.name = name
    this.prefix = prefix
    this.encoder = new Encoder(name, prefix)
    this.decoder = new Decoder(name)
  }

  /**
   * @param {Uint8Array} input
   * @returns {string}
   */
  encode (input) {
    return this.encoder.encode(input)
  }

  /**
   * @param {string} input
   * @returns {Uint8Array}
   */
  decode (input) {
    return this.decoder.decode(input)
  }

  /**
   * @template {string} Base
   * @template {string} Prefix
   * @param {Object} options
   * @param {Base} options.name
   * @param {Prefix} options.prefix
   */
  static placeholder ({ name, prefix }) {
    return new Codec(name, prefix)
  }

  /**
   * @template {string} Base
   * @template {string} Prefix
   * @param {Codec<Base, Prefix>} codec
   * @param {Object} options
   * @param {string} options.alphabet
   * @param {(input:Uint8Array, alphabet:string) => string} options.encode
   * @param {(input:string, alphabet:string) => Uint8Array} options.decode
   */
  static implementWithAlphabet (codec, { encode, decode, alphabet }) {
    const { name } = this
    return this.implement(codec, {
      encode: (input) => encode(input, alphabet),
      decode: (input) => {
        for (const char of input) {
          if (alphabet.indexOf(char) < 0) {
            throw new Error(`invalid ${name} character`)
          }
        }
        return decode(input, alphabet)
      }
    })
  }

  /**
   * @template {string} Base
   * @template {string} Prefix
   * @template Settings
   *
   * @param {Codec<Base, Prefix>} codec
   * @param {Object} options
   * @param {Settings} options.settings
   * @param {(input:Uint8Array, settings:Settings) => string} options.encode
   * @param {(input:string, settings:Settings) => Uint8Array} options.decode
   */

  static implementWithSettings (codec, { settings, encode, decode }) {
    return this.implement(codec, {
      encode: (input) => encode(input, settings),
      decode: (input) => decode(input, settings)
    })
  }

  /**
   * @template {string} Base
   * @template {string} Prefix
   * @param {Codec<Base, Prefix>} codec
   * @param {Object} a
   * @param {(bytes:Uint8Array) => string} a.encode
   * @param {(input:string) => Uint8Array} a.decode
   * @returns {Codec<Base, Prefix>}
   */
  static implement (codec, { encode, decode }) {
    defineReadOnly(codec.encoder, 'encode', bytes => `${codec.prefix}${encode(bytes)}`)
    defineReadOnly(codec.decoder, 'decode', text => decode(text.slice(1)))

    return codec
  }
}

const defineReadOnly = (target, name, value) =>
  Object.defineProperty(target, name, {
    value,
    enumerable: false,
    configurable: false,
    writable: false
  })

export const base16 = Codec.placeholder({
  prefix: 'f',
  name: 'base16'
})

export const base32 = Codec.placeholder({
  prefix: 'b',
  name: 'base32'
})

export const base32pad = Codec.placeholder({
  prefix: 'c',
  name: 'base32pad'
})

export const base32hex = Codec.placeholder({
  prefix: 'v',
  name: 'base32hex'
})

export const base32hexpad = Codec.placeholder({
  prefix: 't',
  name: 'base32hexpad'
})

export const base32z = Codec.placeholder({
  prefix: 'h',
  name: 'base32z'
})

export const base58btc = Codec.placeholder({
  name: 'base58btc',
  prefix: 'z'
})

export const base58flickr = Codec.placeholder({
  name: 'base58flickr',
  prefix: 'Z'
})

export const base64 = Codec.placeholder({
  name: 'base64',
  prefix: 'm'
})

export const base64pad = Codec.placeholder({
  name: 'base64pad',
  prefix: 'M'
})

export const base64url = Codec.placeholder({
  name: 'base64url',
  prefix: 'u'
})

export const base64urlpad = Codec.placeholder({
  name: 'base64urlpad',
  prefix: 'U'
})
