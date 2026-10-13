/**
 * Écrit les données de l'aperçu en fichiers JSON (un par document), prêts à
 * être envoyés dans la base de l'Artifact.
 *
 *   npm run preview:seed -- <dossier de sortie> [fichier des identifiants .csv]
 *
 * Avec le fichier des identifiants (même format que `members:import`), seuls
 * ces comptes existent dans l'aperçu ; sinon, l'équipe fictive du mode démo.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { todayIso } from "@/lib/dates";
import { parseMembersCsv } from "../scripts/members-csv";
import { buildSeed } from "./seed-data";

const out = process.argv[2] ?? "preview/seed";
const csv = process.argv[3];
const docs = await buildSeed(todayIso(), csv ? { members: parseMembersCsv(readFileSync(csv, "utf8")) } : {});
rmSync(out, { recursive: true, force: true });
for (const doc of docs) {
  mkdirSync(join(out, doc.collection), { recursive: true });
  writeFileSync(join(out, doc.collection, `${doc.id}.json`), JSON.stringify(doc.data));
}
console.log(`${docs.length} documents écrits dans ${out}`);
