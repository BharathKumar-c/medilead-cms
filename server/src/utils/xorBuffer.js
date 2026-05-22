/**
 * XOR Buffer Utilities
 *
 * Provides XOR-based encode/decode for in-memory obfuscation of sensitive values.
 * Uses a random session key generated at startup so encoded values differ every run.
 * Decoded values should be discarded immediately after use.
 *
 * @module xorBuffer
 */

const crypto = require('crypto');

/**
 * XOR-encode a Buffer using the given key (repeated cyclically).
 * @param {Buffer} data - Plaintext buffer to encode
 * @param {Buffer} key - XOR key (any length; cycled over data)
 * @returns {Buffer} Encoded buffer (same length as data)
 */
function xorEncode(data, key) {
  const result = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ key[i % key.length];
  }
  return result;
}

/**
 * XOR-decode a Buffer (symmetric — same operation as encode).
 * @param {Buffer} encoded - Encoded buffer
 * @param {Buffer} key - XOR key used during encoding
 * @returns {Buffer} Decoded buffer
 */
function xorDecode(encoded, key) {
  return xorEncode(encoded, key);
}

/**
 * Generate a cryptographically random XOR session key.
 * Should be called once at startup; never persisted.
 * @param {number} [length=32] - Key length in bytes
 * @returns {Buffer} Random key
 */
function generateSessionKey(length = 32) {
  return crypto.randomBytes(length);
}

module.exports = { xorEncode, xorDecode, generateSessionKey };
