import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseConfig } from "../env";

/**
 * Client Supabase du serveur (clé secrète). C'est le seul accès à la base :
 * les autorisations sont vérifiées par le site avant chaque opération.
 */
export function createServerClient(config: SupabaseConfig): SupabaseClient {
  return createClient(config.url, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
