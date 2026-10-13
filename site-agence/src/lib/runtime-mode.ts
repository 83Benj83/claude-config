/**
 * Choix du mode de fonctionnement à partir des variables d'environnement.
 * Fonction pure, partagée par le proxy et le serveur.
 *
 * - les trois variables Supabase présentes → mode Supabase ;
 * - aucune variable → mode démo, autorisé en développement, ou en production
 *   seulement avec `DEMO_MODE=1` (jamais par accident) ;
 * - configuration partielle → erreur explicite.
 */

export type SupabaseConfig = {
  url: string;
  publishableKey: string;
  secretKey: string;
};

export type RuntimeMode = { kind: "supabase"; config: SupabaseConfig } | { kind: "demo" };

type Env = Record<string, string | undefined>;

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export function resolveRuntimeMode(env: Env): RuntimeMode {
  const url = env.SUPABASE_URL?.trim();
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY?.trim();
  const secretKey = env.SUPABASE_SECRET_KEY?.trim();
  const provided = [url, publishableKey, secretKey].filter(Boolean).length;

  if (url && publishableKey && secretKey) {
    return { kind: "supabase", config: { url, publishableKey, secretKey } };
  }
  if (provided > 0) {
    throw new ConfigurationError(
      "Configuration Supabase incomplète : définis SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY et SUPABASE_SECRET_KEY.",
    );
  }
  if (env.NODE_ENV === "production" && env.DEMO_MODE !== "1") {
    throw new ConfigurationError(
      "Supabase n'est pas configuré. Définis les variables SUPABASE_* (ou DEMO_MODE=1 pour un site de démonstration).",
    );
  }
  return { kind: "demo" };
}

/** Longueur minimale du code d'invitation, pour résister aux essais en série. */
export const MIN_INVITE_CODE_LENGTH = 12;

/** Code d'invitation valide, ou `null` si absent ou trop court (inscriptions fermées). */
export function resolveInviteCode(env: Env): string | null {
  const code = env.TEAM_INVITE_CODE?.trim();
  return code && code.length >= MIN_INVITE_CODE_LENGTH ? code : null;
}
