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
