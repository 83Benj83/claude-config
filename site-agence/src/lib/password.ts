/**
 * Hachage des mots de passe (PBKDF2-SHA256 via Web Crypto).
 * Même code côté serveur (Node 20+) et dans l'aperçu (navigateur) ;
 * le mot de passe n'est jamais stocké en clair.
 *
 * Format : `pbkdf2$<itérations>$<sel base64>$<empreinte base64>`.
 */

/** Recommandation OWASP pour PBKDF2-HMAC-SHA256. */
export const DEFAULT_ITERATIONS = 600_000;
const KEY_BYTES = 32;
const SALT_BYTES = 16;

const subtle = () => globalThis.crypto.subtle;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await subtle().importKey("raw", new TextEncoder().encode(password.normalize("NFC")), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await subtle().deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, key, KEY_BYTES * 8);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string, iterations = DEFAULT_ITERATIONS): Promise<string> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const digest = await derive(password, salt, iterations);
  return `pbkdf2$${iterations}$${toBase64(salt)}$${toBase64(digest)}`;
}

/** Comparaison à temps constant (pas d'arrêt au premier octet différent). */
function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const parts = stored?.split("$") ?? [];
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1_000 || iterations > 5_000_000) return false;
  try {
    const digest = await derive(password, fromBase64(parts[2]), iterations);
    return equalBytes(digest, fromBase64(parts[3]));
  } catch {
    return false;
  }
}

/** Mot de passe lisible généré pour un nouvel identifiant (sans caractères ambigus). */
export function generatePassword(length = 10): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  // Rejet des octets au-delà du plus grand multiple de 31 : tirage uniforme.
  const limit = 256 - (256 % alphabet.length);
  let password = "";
  while (password.length < length) {
    for (const byte of globalThis.crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (byte < limit && password.length < length) password += alphabet[byte % alphabet.length];
    }
  }
  return password;
}
