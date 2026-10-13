import "server-only";
import { resolveRuntimeMode, type SupabaseConfig } from "./runtime-mode";

export type { SupabaseConfig };

/**
 * Configuration lue côté serveur uniquement : aucune clé n'est exposée au
 * navigateur. Retourne `null` quand le site tourne en mode démo.
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  const mode = resolveRuntimeMode(process.env);
  return mode.kind === "supabase" ? mode.config : null;
}

export function isDemoMode(): boolean {
  return getSupabaseConfig() === null;
}

/**
 * Secret de signature des sessions. En démo, une valeur fixe suffit : les
 * comptes de démonstration et leurs mots de passe sont publics.
 */
export function getSessionSecret(): string {
  return getSupabaseConfig()?.sessionSecret ?? "mode-demo-secret-public-ne-protege-rien-en-production";
}
