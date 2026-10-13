import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Jeton de session signé (HMAC-SHA256), stocké dans un cookie httpOnly :
 * `<idMembre>.<version>.<expiration>.<signature>`.
 * - la signature empêche de fabriquer ou modifier un jeton ;
 * - la version est comparée à celle du membre : un changement de mot de
 *   passe ou une désactivation invalide les sessions ouvertes.
 */

export type SessionPayload = { memberId: string; version: number; expiresAt: number };

const sign = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("base64url");

export function createToken({ memberId, version, expiresAt }: SessionPayload, secret: string): string {
  const payload = `${memberId}.${version}.${expiresAt}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function readToken(token: string | undefined, secret: string, now: number = Date.now()): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [memberId, versionText, expiresText, signature] = parts;
  const expected = Buffer.from(sign(`${memberId}.${versionText}.${expiresText}`, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  const version = Number(versionText);
  const expiresAt = Number(expiresText);
  if (!memberId || !Number.isInteger(version) || !Number.isFinite(expiresAt) || expiresAt <= now) return null;
  return { memberId, version, expiresAt };
}
