/**
 * Prépare la migration SQL qui charge une liste « À contacter » dans la base
 * en ligne (appliquée seule à la prochaine mise en ligne) :
 *
 *   npm run leads:seed-sql -- data/leads-paris-2026-10.json supabase/migrations/0010_leads_paris.sql "Titre"
 *
 * Chaque ligne est lue comme dans `leads:add` : une ligne refusée arrête tout.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { todayIso } from "@/lib/dates";
import { parseLead } from "@/lib/leads";
import { leadsSeedSql, type SeedLead } from "@/lib/leads-seed";

const [input, output, title = "Liste « À contacter »"] = process.argv.slice(2);
if (!input || !output) {
  console.error("Usage : npm run leads:seed-sql -- <liste.json> <migration.sql> [titre]");
  process.exit(1);
}

const rows: unknown = JSON.parse(readFileSync(input, "utf8"));
if (!Array.isArray(rows)) {
  console.error("Le fichier doit contenir un tableau JSON.");
  process.exit(1);
}

const leads: SeedLead[] = [];
rows.forEach((row, index) => {
  const parsed = parseLead(row, todayIso());
  if (!parsed.ok) {
    console.error(`Ligne ${index + 1} refusée : ${parsed.message}`);
    process.exit(1);
  }
  const { listDay: _day, ...lead } = parsed.lead;
  leads.push(lead);
});

writeFileSync(output, leadsSeedSql(leads, title));
console.log(`${leads.length} commerces écrits dans ${output}.`);
