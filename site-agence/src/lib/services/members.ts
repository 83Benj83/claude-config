import { ADMIN_ONLY, type ActionResult, type MemberFormValues, type ResourceFormValues } from "../actions-contract";
import { loginKey, type Credentials, type Repository } from "../data/repository";
import { hashPassword, verifyPassword } from "../password";
import { wouldCreateCycle } from "../stats";
import type { Member } from "../types";
import { fieldErrors, loginSchema, memberSchema, resourceSchema, welcomeSchema } from "../validation";

export const WRONG_CREDENTIALS = "Identifiant ou mot de passe incorrect.";

/** Empreinte factice : même durée de vérification qu'un identifiant existe ou non. */
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("identifiant-inexistant"));

/**
 * Vérifie un identifiant et son mot de passe. Ne révèle jamais lequel des
 * deux est faux. Les identifiants désactivés sont refusés.
 */
export async function authenticate(
  repository: Repository,
  input: { login: string; password: string },
): Promise<{ ok: true; credentials: Credentials } | { ok: false; errors?: Record<string, string>; message?: string }> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const credentials = await repository.getCredentialsByLogin(parsed.data.login);
  const hash = credentials?.passwordHash;
  // Sans empreinte (identifiant inconnu, ou créé sans mot de passe) : même calcul, mais toujours refusé.
  const valid = hash ? await verifyPassword(parsed.data.password, hash) : (await verifyPassword(parsed.data.password, await getDummyHash()), false);
  if (!credentials || !valid || !credentials.member.active) return { ok: false, message: WRONG_CREDENTIALS };
  return { ok: true, credentials };
}

export async function completeWelcome(
  repository: Repository,
  actor: Member,
  input: { fullName: string; jobTitle: string },
  now: string,
): Promise<ActionResult> {
  // Une seule fois : ensuite, le nom et le poste sont gérés par les admins.
  if (actor.welcomedAt) return { ok: false, message: "Ton profil est déjà confirmé." };
  const parsed = welcomeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  await repository.updateMember(actor.id, { ...parsed.data, welcomedAt: now });
  return { ok: true, data: null };
}

/** Création ou modification d'un identifiant (admin uniquement). */
export async function saveMember(repository: Repository, actor: Member, input: MemberFormValues): Promise<ActionResult> {
  if (!actor.isAdmin) return { ok: false, message: ADMIN_ONLY };
  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const { id, password, ...fields } = parsed.data;

  const members = await repository.listMembers();
  const target = id ? members.find((m) => m.id === id) : null;
  if (id && !target) return { ok: false, message: "Ce membre n'existe plus." };

  const homonym = members.find((m) => loginKey(m.login) === loginKey(fields.login) && m.id !== id);
  if (homonym) return { ok: false, errors: { login: `Identifiant déjà utilisé par ${homonym.fullName}.` } };
  if (fields.managerId && !members.some((m) => m.id === fields.managerId)) {
    return { ok: false, errors: { managerId: "Responsable introuvable." } };
  }
  if (id && wouldCreateCycle(members, id, fields.managerId)) {
    return { ok: false, errors: { managerId: "Ce choix créerait une boucle dans l'organigramme." } };
  }

  if (!target) {
    if (!password) return { ok: false, errors: { password: "Définis un mot de passe pour ce nouvel identifiant." } };
    await repository.createMember({ ...fields, sortOrder: members.length, passwordHash: await hashPassword(password) });
    return { ok: true, data: null, message: `Identifiant « ${fields.login} » créé.` };
  }

  const otherActiveAdmins = members.filter((m) => m.isAdmin && m.active && m.id !== target.id).length;
  if (target.isAdmin && target.active && (!fields.isAdmin || !fields.active) && otherActiveAdmins === 0) {
    return { ok: false, errors: { isAdmin: "Il faut garder au moins un administrateur actif." } };
  }

  await repository.updateMember(target.id, {
    ...fields,
    ...(password ? { passwordHash: await hashPassword(password) } : {}),
    // Nouveau mot de passe ou désactivation : les sessions ouvertes sont fermées.
    revokeSessions: Boolean(password) || (target.active && !fields.active),
  });
  return { ok: true, data: null, message: password ? "Modifications et nouveau mot de passe enregistrés." : "Modifications enregistrées." };
}

export async function saveResource(repository: Repository, actor: Member, input: ResourceFormValues): Promise<ActionResult> {
  if (!actor.isAdmin) return { ok: false, message: ADMIN_ONLY };
  const parsed = resourceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const { id, ...resource } = parsed.data;
  await repository.saveResource({ id: id ?? crypto.randomUUID(), ...resource });
  return { ok: true, data: null, message: id ? "Ressource mise à jour." : "Ressource ajoutée." };
}

export async function deleteResource(repository: Repository, actor: Member, id: string): Promise<ActionResult> {
  if (!actor.isAdmin) return { ok: false, message: ADMIN_ONLY };
  await repository.deleteResource(id);
  return { ok: true, data: null, message: "Ressource supprimée." };
}
