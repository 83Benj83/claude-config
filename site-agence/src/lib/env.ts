import "server-only";
import { resolveInviteCode, resolveRuntimeMode, type SupabaseConfig } from "./runtime-mode";

export type { SupabaseConfig };

/**
 * Configuration Supabase lue côté serveur uniquement : aucune clé n'est
 * exposée au navigateur. Retourne `null` quand le site tourne en mode démo.
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  const mode = resolveRuntimeMode(process.env);
  return mode.kind === "supabase" ? mode.config : null;
}

export function isDemoMode(): boolean {
  return getSupabaseConfig() === null;
}

/** Code à transmettre aux nouveaux membres pour créer leur compte. */
export function getInviteCode(): string | null {
  return resolveInviteCode(process.env);
}

/** Options des cookies de session : aucun client Supabase dans le navigateur, donc httpOnly. */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;
