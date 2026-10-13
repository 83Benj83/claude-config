import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { getSupabaseConfig } from "../env";
import { createAdminClient, createSessionClient } from "../supabase/server";
import { getDemoRepository } from "./demo-repository";
import type { Repository } from "./repository";
import { SupabaseRepository } from "./supabase-repository";

/** Repository de la requête en cours (Supabase si configuré, sinon démo). */
export const getRepository = cache(async (): Promise<Repository> => {
  // Données vivantes : toujours lues à la requête, jamais figées au build.
  await connection();
  const config = getSupabaseConfig();
  if (!config) return getDemoRepository();
  return new SupabaseRepository(await createSessionClient(config), createAdminClient(config));
});
