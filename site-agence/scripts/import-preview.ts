/**
 * Mise en ligne : reprend les identifiants de l'aperçu dans Supabase, avec
 * les mêmes mots de passe (empreintes recopiées, jamais de mot de passe en clair).
 *
 *   npm run members:from-preview -- <dossier>             (import)
 *   npm run members:from-preview -- <dossier> --verifier  (vérifie sans rien écrire)
 *
 * <dossier> contient `members/*.json` et `credentials/*.json`, un fichier par
 * document de la base de l'aperçu. Ce dossier contient des empreintes de mots
 * de passe : le garder hors du dépôt et le supprimer après l'import.
 * Les variables SUPABASE_URL, SUPABASE_SECRET_KEY et SESSION_SECRET sont lues dans `.env.local`.
 */
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { AGENCY_RESOURCES } from "@/content/resources";
import { SupabaseRepository } from "@/lib/data/supabase-repository";
import { resolveRuntimeMode } from "@/lib/runtime-mode";
import { createServerClient } from "@/lib/supabase/server";
import { membersFromPreview } from "./preview-members";

function readDocs(folder: string): Record<string, unknown> {
  return Object.fromEntries(
    readdirSync(folder)
      .filter((name) => name.endsWith(".json"))
      .map((name) => [name.replace(/\.json$/, ""), JSON.parse(readFileSync(join(folder, name), "utf8")) as unknown]),
  );
}

async function main() {
  const folder = process.argv[2];
  if (!folder) throw new Error("Indique le dossier exporté : npm run members:from-preview -- <dossier>");
  const { members, problems } = membersFromPreview(readDocs(join(folder, "members")), readDocs(join(folder, "credentials")));
  if (problems.length > 0) throw new Error(`Rien n'a été importé :\n- ${problems.join("\n- ")}`);
  if (process.argv.includes("--verifier")) {
    console.log(`Export valide : ${members.length} identifiant(s), admin(s) : ${members.filter((m) => m.isAdmin).map((m) => m.login).join(", ")}. Rien n'a été écrit.`);
    return;
  }

  const mode = resolveRuntimeMode(process.env);
  if (mode.kind !== "supabase") throw new Error("Supabase n'est pas configuré : renseigne .env.local (voir .env.example).");
  const repository = new SupabaseRepository(createServerClient(mode.config));

  const ids = new Map<string, string>();
  for (const member of members) {
    const { key, managerKey, welcomedAt, passwordHash, ...profile } = member;
    const existing = await repository.getCredentialsByLogin(profile.login);
    if (existing) {
      await repository.updateMember(existing.member.id, { ...profile, passwordHash, revokeSessions: true });
      ids.set(key, existing.member.id);
    } else {
      const created = await repository.createMember({ ...profile, managerId: null, avatarUrl: null, passwordHash });
      ids.set(key, created.id);
    }
    // Première connexion déjà faite dans l'aperçu : pas d'écran de bienvenue.
    if (welcomedAt) await repository.updateMember(ids.get(key)!, { welcomedAt });
  }
  for (const member of members) {
    const managerId = member.managerKey ? ids.get(member.managerKey) : undefined;
    if (managerId) await repository.updateMember(ids.get(member.key)!, { managerId });
  }
  let resources = 0;
  if ((await repository.listResources()).length === 0) {
    for (const resource of AGENCY_RESOURCES) {
      await repository.saveResource({ ...resource, id: randomUUID() });
      resources += 1;
    }
  }
  console.log(`Import terminé : ${members.length} identifiant(s)${resources ? `, ${resources} ressources ajoutées` : ""}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
