/**
 * Prépare la migration SQL qui ajoute des contacts déjà faits aux prospects
 * des membres (classement compris), appliquée seule à la prochaine mise en ligne :
 *
 *   npm run prospects:seed-sql -- data/prospects.json supabase/migrations/00XX_nom.sql "Titre"
 *
 * Chaque ligne est vérifiée comme dans le formulaire : une ligne refusée arrête tout.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseSeedProspect, prospectsSeedSql, type SeedProspect } from "@/lib/prospects-seed";

const [input, output, title = "Contacts déjà faits"] = process.argv.slice(2);
if (!input || !output) {
  console.error("Usage : npm run prospects:seed-sql -- <contacts.json> <migration.sql> [titre]");
  process.exit(1);
}

const rows: unknown = JSON.parse(readFileSync(input, "utf8"));
if (!Array.isArray(rows)) {
  console.error("Le fichier doit contenir un tableau JSON.");
  process.exit(1);
}

const prospects: SeedProspect[] = [];
rows.forEach((row, index) => {
  const parsed = parseSeedProspect(row);
  if (!parsed.ok) {
    console.error(`Ligne ${index + 1} refusée : ${parsed.message}`);
    process.exit(1);
  }
  prospects.push(parsed.prospect);
});

writeFileSync(output, prospectsSeedSql(prospects, title));
console.log(`${prospects.length} contacts lus, migration écrite dans ${output}.`);
