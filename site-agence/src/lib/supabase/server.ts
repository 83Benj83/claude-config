import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SESSION_COOKIE_OPTIONS, type SupabaseConfig } from "../env";

/** Client lié à la session du membre connecté : toutes les requêtes passent par la RLS. */
export async function createSessionClient(config: SupabaseConfig): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(config.url, config.publishableKey, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Appelé depuis un Server Component : le proxy se charge de rafraîchir les cookies.
        }
      },
    },
  });
}

/**
 * Client administrateur (clé secrète, contourne la RLS). Réservé aux actions
 * dont l'autorisation a déjà été vérifiée côté serveur.
 */
export function createAdminClient(config: SupabaseConfig): SupabaseClient {
  return createClient(config.url, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
