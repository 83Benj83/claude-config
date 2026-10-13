import "server-only";

export type SupabaseConfig = {
  url: string;
  publishableKey: string;
  secretKey: string;
};

/**
 * Configuration Supabase lue côté serveur uniquement : aucune clé n'est
 * exposée au navigateur. Retourne `null` quand le site tourne en mode démo.
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !publishableKey || !secretKey) return null;
  return { url, publishableKey, secretKey };
}

export function isDemoMode(): boolean {
  return getSupabaseConfig() === null;
}

/** Code à transmettre aux nouveaux membres pour créer leur compte. */
export function getInviteCode(): string | null {
  const code = process.env.TEAM_INVITE_CODE?.trim();
  return code ? code : null;
}
