/**
 * Importe la liste des identifiants dans Supabase (première mise en place,
 * ou ajout groupé). Chaque ligne du CSV donne un identifiant et SON mot de
 * passe ; seule l'empreinte du mot de passe est enregistrée.
 *
 *   npm run members:import -- identifiants.csv             (import)
 *   npm run members:import -- identifiants.csv --verifier  (vérifie le fichier sans rien écrire)
 *
 * Format (séparateur `;`, première ligne = en-têtes) :
 *   identifiant;nom;poste;mot de passe;admin;responsable;pôle;prospecteur
 *   paul;Paul Martin;Fondateur;un-mot-de-passe-solide;oui;;Direction;non
 *   sarah;Sarah Benali;Prospectrice;un-autre-mot-de-passe;non;paul;Prospection;oui
 *
 * Un identifiant déjà présent est mis à jour (nom, poste, rôle, mot de passe)
 * et ses sessions ouvertes sont fermées. Au premier import, « Mails et liens »
 * reçoit les contacts, liens et modèles du guide. Les variables SUPABASE_URL,
 * SUPABASE_SECRET_KEY et SESSION_SECRET sont lues dans `.env.local`.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { AGENCY_RESOURCES } from "@/content/resources";
import { loginKey } from "@/lib/data/repository";
import { SupabaseRepository } from "@/lib/data/supabase-repository";
import { hashPassword } from "@/lib/password";
import { resolveRuntimeMode } from "@/lib/runtime-mode";
import { createServerClient } from "@/lib/supabase/server";
import { fieldErrors, memberSchema } from "@/lib/validation";
import { parseMembersCsv } from "./members-csv";
const COLUMNS: Record<string, string> = { login: "identifiant", fullName: "nom", jobTitle: "poste", password: "mot de passe" };

async function main() {
  const file = process.argv[2];
  const dryRun = process.argv.includes("--verifier");
  if (!file) throw new Error("Indique le fichier CSV : npm run members:import -- identifiants.csv");
  const rows = parseMembersCsv(readFileSync(file, "utf8"));
  if (rows.length === 0) throw new Error("Aucune ligne à importer (la première ligne est réservée aux en-têtes).");

  // Tout est vérifié avant d'écrire quoi que ce soit.
  const problems: string[] = [];
  const seen = new Set<string>();
  const parsed = rows.map((row) => {
    const result = memberSchema.safeParse({
      id: "",
      login: row.login,
      fullName: row.fullName,
      jobTitle: row.jobTitle || "Membre de l'équipe",
      department: row.department,
      managerId: "",
      avatarUrl: "",
      password: row.password,
      isProspector: row.isProspector,
      isAdmin: row.isAdmin,
      active: true,
    });
    if (!result.success) {
      problems.push(`ligne ${row.line} : ${Object.entries(fieldErrors(result.error)).map(([field, message]) => `${COLUMNS[field] ?? field} — ${message}`).join(", ")}`);
    } else if (!result.data.password) {
      problems.push(`ligne ${row.line} : mot de passe manquant.`);
    } else if (seen.has(loginKey(result.data.login))) {
      problems.push(`ligne ${row.line} : identifiant « ${row.login} » en double dans le fichier.`);
    }
    seen.add(loginKey(row.login));
    return result.success ? result.data : null;
  });
  const logins = new Set(rows.map((row) => loginKey(row.login)));
  for (const row of rows) {
    if (row.managerLogin && !logins.has(loginKey(row.managerLogin))) {
      problems.push(`ligne ${row.line} : responsable « ${row.managerLogin} » absent du fichier.`);
    }
  }
  if (problems.length > 0) throw new Error(`Rien n'a été importé :\n- ${problems.join("\n- ")}`);
  if (dryRun) {
    const admins = parsed.filter((member) => member?.isAdmin).map((member) => member?.login);
    console.log(`Fichier valide : ${parsed.length} identifiant(s), admin(s) : ${admins.join(", ") || "aucun"}. Rien n'a été écrit.`);
    return;
  }
  const mode = resolveRuntimeMode(process.env);
  if (mode.kind !== "supabase") throw new Error("Supabase n'est pas configuré : renseigne .env.local (voir .env.example).");
  const repository = new SupabaseRepository(createServerClient(mode.config));

  if (!parsed.some((member) => member?.isAdmin)) {
    const existingAdmins = (await repository.listMembers()).filter((member) => member.isAdmin && member.active);
    if (existingAdmins.length === 0) throw new Error("Rien n'a été importé : marque au moins une personne comme admin (colonne admin = oui).");
  }

  let created = 0;
  let updated = 0;
  const startOrder = (await repository.listMembers()).length;
  for (const [index, member] of parsed.entries()) {
    if (!member) continue;
    const { id, password, ...fields } = member;
    const passwordHash = await hashPassword(password);
    const existing = await repository.getCredentialsByLogin(fields.login);
    if (existing) {
      await repository.updateMember(existing.member.id, {
        fullName: fields.fullName,
        jobTitle: fields.jobTitle,
        department: fields.department,
        isProspector: fields.isProspector,
        isAdmin: fields.isAdmin,
        active: true,
        passwordHash,
        revokeSessions: true,
      });
      updated += 1;
    } else {
      await repository.createMember({ ...fields, sortOrder: startOrder + index, passwordHash });
      created += 1;
    }
  }
  // Responsables, une fois tout le monde créé.
  for (const row of rows) {
    if (!row.managerLogin) continue;
    const [member, manager] = await Promise.all([repository.getCredentialsByLogin(row.login), repository.getCredentialsByLogin(row.managerLogin)]);
    if (member && manager && member.member.id !== manager.member.id) await repository.updateMember(member.member.id, { managerId: manager.member.id });
  }
  // Premier import : « Mails et liens » reçoit les contacts, liens et modèles du guide.
  let resources = 0;
  if ((await repository.listResources()).length === 0) {
    for (const resource of AGENCY_RESOURCES) {
      await repository.saveResource({ ...resource, id: randomUUID() });
      resources += 1;
    }
  }
  console.log(`Import terminé : ${created} identifiant(s) créé(s), ${updated} mis à jour${resources ? `, ${resources} ressources ajoutées` : ""}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
