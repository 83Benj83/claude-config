/**
 * Données de l'aperçu, au format de sa base partagée. Servent à
 * l'installation initiale (script `preview:seed`) et à la base locale de test.
 *
 * - Sans liste d'identifiants : l'équipe fictive du mode démo.
 * - Avec la liste de l'agence (fichier CSV, jamais dans le dépôt) : ces
 *   identifiants seulement, première connexion à faire, et un historique
 *   d'exemple réparti entre eux pour voir le classement et le bilan.
 */
import { DEMO_MEMBERS, DEMO_RESOURCES, generateDemoProspects } from "@/lib/data/demo-seed";
import { loginKey } from "@/lib/data/repository";
import { monthKeyOf } from "@/lib/dates";
import { hashPassword } from "@/lib/password";
import type { IsoDate, Prospect } from "@/lib/types";
import type { MemberCsvRow } from "../scripts/members-csv";
import { monthDocId } from "./store";

export type SeedDoc = { collection: "members" | "credentials" | "prospects" | "resources"; id: string; data: Record<string, unknown> };

/** Un membre = sa fiche publique + ses informations de connexion (collection protégée). */
function memberDocs(id: string, { passwordHash, sessionVersion, ...member }: Record<string, unknown>): SeedDoc[] {
  return [
    { collection: "members", id, data: member },
    { collection: "credentials", id, data: { passwordHash, sessionVersion } },
  ];
}

/** Équipe fictive : assez d'itérations pour un vrai hachage, connexion rapide (mots de passe publics). */
export const SEED_HASH_ITERATIONS = 100_000;

/** Identifiant de document lisible : `paul`, `benjamin`… */
const memberDocId = (login: string) => loginKey(login).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "membre";

async function fictionalMembers(iterations: number): Promise<SeedDoc[]> {
  const docs = await Promise.all(
    DEMO_MEMBERS.map(async ({ id, demoPassword, ...member }) =>
      memberDocs(id, { ...member, passwordHash: await hashPassword(demoPassword, iterations), sessionVersion: 1 }),
    ),
  );
  return docs.flat();
}

async function agencyMembers(rows: MemberCsvRow[]): Promise<SeedDoc[]> {
  const ids = new Map(rows.map((row) => [loginKey(row.login), memberDocId(row.login)]));
  const docs = await Promise.all(
    rows.map(async (row, index) =>
      memberDocs(memberDocId(row.login), {
        login: row.login,
        fullName: row.fullName,
        jobTitle: row.jobTitle || "Membre de l'équipe",
        department: null,
        managerId: row.managerLogin ? (ids.get(loginKey(row.managerLogin)) ?? null) : null,
        avatarUrl: null,
        isProspector: true,
        isAdmin: row.isAdmin,
        active: true,
        sortOrder: index,
        // Première connexion : chacun confirme son nom et son poste.
        welcomedAt: null,
        lastLoginAt: null,
        // Vrais mots de passe : hachage complet.
        passwordHash: await hashPassword(row.password),
        sessionVersion: 1,
      }),
    ),
  );
  return docs.flat();
}

/** Historique d'exemple : les rythmes de l'équipe fictive, attribués aux membres donnés (admins d'abord). */
function exampleProspects(today: IsoDate, memberIds: string[] | null): Prospect[] {
  const generated = generateDemoProspects(today);
  if (!memberIds) return generated;
  const profiles = [...new Set(generated.map((prospect) => prospect.memberId))];
  const owner = new Map(profiles.slice(0, memberIds.length).map((profile, index) => [profile, memberIds[index]]));
  return generated.flatMap((prospect) => {
    const memberId = owner.get(prospect.memberId);
    return memberId ? [{ ...prospect, id: prospect.id.replace(`demo-${prospect.memberId}-`, `exemple-${memberId}-`), memberId }] : [];
  });
}

export async function buildSeed(
  today: IsoDate,
  { iterations = SEED_HASH_ITERATIONS, members }: { iterations?: number; members?: MemberCsvRow[] } = {},
): Promise<SeedDoc[]> {
  const people = members ? await agencyMembers(members) : await fictionalMembers(iterations);
  const profiles = people.filter((doc) => doc.collection === "members");
  const ordered = members ? [...profiles].sort((a, b) => Number(b.data.isAdmin) - Number(a.data.isAdmin)).map((doc) => doc.id) : null;

  const months = new Map<string, { memberId: string; month: string; items: Omit<Prospect, "memberId">[] }>();
  for (const { memberId, ...item } of exampleProspects(today, ordered)) {
    const month = monthKeyOf(item.date);
    const id = monthDocId(memberId, month);
    const entry = months.get(id) ?? { memberId, month, items: [] };
    entry.items.push(item);
    months.set(id, entry);
  }

  return [
    ...people,
    ...DEMO_RESOURCES.map(({ id, ...resource }): SeedDoc => ({ collection: "resources", id, data: { ...resource } })),
    ...[...months].map(([id, data]): SeedDoc => ({ collection: "prospects", id, data })),
  ];
}
