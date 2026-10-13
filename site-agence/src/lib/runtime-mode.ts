/**
 * Choix du mode de fonctionnement à partir des variables d'environnement.
 * Fonction pure, partagée par le proxy et le serveur.
 *
 * - SUPABASE_URL + SUPABASE_SECRET_KEY + SESSION_SECRET → mode Supabase ;
 * - aucune de ces variables → mode démo, autorisé en développement, ou en
 *   production seulement avec `DEMO_MODE=1` (jamais par accident) ;
 * - configuration partielle ou secret de session trop court → erreur explicite.
 */

export type SupabaseConfig = {
  url: string;
  secretKey: string;
  sessionSecret: string;
};

export type RuntimeMode = { kind: "supabase"; config: SupabaseConfig } | { kind: "demo" };

type Env = Record<string, string | undefined>;

/** Longueur minimale du secret qui signe les cookies de session. */
export const MIN_SESSION_SECRET_LENGTH = 32;

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export function resolveRuntimeMode(env: Env): RuntimeMode {
  const url = env.SUPABASE_URL?.trim();
  const secretKey = env.SUPABASE_SECRET_KEY?.trim();
  const sessionSecret = env.SESSION_SECRET?.trim();
  const provided = [url, secretKey, sessionSecret].filter(Boolean).length;

  if (url && secretKey && sessionSecret) {
    if (sessionSecret.length < MIN_SESSION_SECRET_LENGTH) {
      throw new ConfigurationError(`SESSION_SECRET doit contenir au moins ${MIN_SESSION_SECRET_LENGTH} caractères.`);
    }
    return { kind: "supabase", config: { url, secretKey, sessionSecret } };
  }
  if (provided > 0) {
    throw new ConfigurationError(
      "Configuration incomplète : définis SUPABASE_URL, SUPABASE_SECRET_KEY et SESSION_SECRET.",
    );
  }
  if (env.NODE_ENV === "production" && env.DEMO_MODE !== "1") {
    throw new ConfigurationError(
      "Supabase n'est pas configuré. Définis SUPABASE_URL, SUPABASE_SECRET_KEY et SESSION_SECRET (ou DEMO_MODE=1 pour un site de démonstration).",
    );
  }
  return { kind: "demo" };
}
