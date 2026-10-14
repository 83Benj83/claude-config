/**
 * Ajoute une liste « À contacter » (commerces sans site web) dans Supabase.
 *
 *   npm run leads:add -- <liste.json> --verifier     (vérifie sans rien écrire)
 *   npm run leads:add -- <liste.json>                (ajoute à la liste en cours)
 *   npm run leads:add -- <liste.json> --remplacer    (range d'abord l'ancienne liste)
 *
 * <liste.json> : un tableau d'objets { nom, ville, categorie, telephone, email,
 * instagram, facebook, note } ; nom et ville obligatoires. Rien n'est écrit si
 * une ligne est refusée. SUPABASE_URL, SUPABASE_SECRET_KEY et SESSION_SECRET
 * sont lus dans `.env.local` (ou un fichier donné à node avec --env-file).
 */
import { readFileSync } from "node:fs";
import { SupabaseRepository } from "@/lib/data/supabase-repository";
import { todayIso } from "@/lib/dates";
import { parseLead } from "@/lib/leads";
import { resolveRuntimeMode } from "@/lib/runtime-mode";
import { addLeadList } from "@/lib/services/leads";
import { createServerClient } from "@/lib/supabase/server";

async function main() {
  const file = process.argv[2];
  if (!file || file.startsWith("--")) throw new Error("Indique la liste : npm run leads:add -- <liste.json>");
  const rows: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("La liste doit être un tableau JSON non vide.");

  const today = todayIso();
  const problems = rows.flatMap((row, index) => {
    const parsed = parseLead(row, today);
    return parsed.ok ? [] : [`ligne ${index + 1} : ${parsed.message}`];
  });
  if (problems.length > 0) throw new Error(`Rien n'a été ajouté :\n- ${problems.join("\n- ")}`);
  if (process.argv.includes("--verifier")) {
    console.log(`Liste valide : ${rows.length} commerce(s). Rien n'a été écrit.`);
    return;
  }

  const mode = resolveRuntimeMode(process.env);
  if (mode.kind !== "supabase") throw new Error("Supabase n'est pas configuré : renseigne .env.local (voir .env.example).");
  const repository = new SupabaseRepository(createServerClient(mode.config));
  const result = await addLeadList(repository, rows, { listDay: today, now: new Date().toISOString(), replace: process.argv.includes("--remplacer") });
  console.log(`Liste ajoutée : ${result.added} commerce(s)${result.archived ? `, ${result.archived} de l'ancienne liste rangé(s)` : ""}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
