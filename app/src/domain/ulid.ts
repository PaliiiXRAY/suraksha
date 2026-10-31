/**
 * Zero-dependency ULID generator (Universally Unique Lexicographically Sortable Identifier).
 * 26 characters: 10 chars timestamp (48-bit ms) + 16 chars randomness (80 bits).
 * Crockford Base32 alphabet.
 */

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ENCODING_LEN = ENCODING.length;

export function generateUlid(nowMs: number = Date.now()): string {
  // 10 chars timestamp
  let timeStr = '';
  let time = nowMs;
  for (let i = 9; i >= 0; i--) {
    const mod = time % ENCODING_LEN;
    timeStr = ENCODING[mod] + timeStr;
    time = (time - mod) / ENCODING_LEN;
  }

  // 16 chars random
  let randStr = '';
  const randBytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randBytes);
  } else {
    for (let i = 0; i < 16; i++) {
      randBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  for (let i = 0; i < 16; i++) {
    randStr += ENCODING[randBytes[i] % ENCODING_LEN];
  }

  return timeStr + randStr;
}

