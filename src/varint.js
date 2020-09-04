import varint from 'varint'

const cache = new Map()
export default new class {
  /**
   * @param {Uint8Array} data
   * @returns {[number, number]}
   */
  decode (data) {
    const code = varint.decode(data)
    return [code, varint.decode.bytes]
  }

  /**
   * @param {number} int
   * @returns {Uint8Array}
   */
  encode (int) {
    if (cache.has(int)) return cache.get(int)
    const bytes = new Uint8Array(varint.encodingLength(int))
    varint.encode(int, bytes, 0)
    cache.set(int, bytes)

    return bytes
  }

  /**
   * @param {number} int
   * @param {Uint8Array} target
   * @param {number} [offset=0]
   */
  encodeTo (int, target, offset = 0) {
    const cached = cache.get(int)
    if (cached) {
      target.set(target, offset)
    } else {
      varint.encode(int, target, 0)
    }
  }

  /**
   * @param {number} int
   * @returns {number}
   */
  encodingLength (int) {
    return varint.encodingLength(int)
  }
}()
