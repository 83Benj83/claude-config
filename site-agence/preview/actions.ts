/**
 * Actions de l'aperçu : les mêmes services que les Server Actions du site
 * (validation, droits, doublons), appelés dans le navigateur.
 */
import {
  GENERIC_ERROR,
  SESSION_EXPIRED,
  type ActionResult,
  type AppActions,
} from "@/lib/actions-contract";
import type { Repository } from "@/lib/data/repository";
import { todayIso } from "@/lib/dates";
import * as members from "@/lib/services/members";
import * as prospects from "@/lib/services/prospects";
import type { Member } from "@/lib/types";
import type { PreviewSession } from "./session";

const READ_ONLY = "Ton accès à cet aperçu est en lecture seule : demande à son propriétaire de t'ajouter comme contributeur.";
const STORAGE_FULL = "Le stockage de l'aperçu est plein : supprime quelques éléments puis réessaie.";

/** Message lisible pour une écriture refusée par la base partagée. */
function failure(error: unknown): ActionResult<never> {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
  if (code === "invalid_argument" || code === "not_granted") return { ok: false, message: READ_ONLY };
  if (code === "quota_exceeded") return { ok: false, message: STORAGE_FULL };
  console.error("[aperçu]", error);
  return { ok: false, message: GENERIC_ERROR };
}

const clock = () => ({ today: todayIso(), now: new Date().toISOString() });

/** Membre de la session, si elle est toujours valide (identifiant actif, mot de passe inchangé). */
export async function currentMemberOf(repository: Repository, session: PreviewSession): Promise<Member | null> {
  const current = session.read();
  if (!current) return null;
  const credentials = await repository.getCredentialsById(current.memberId);
  if (!credentials?.member.active || credentials.sessionVersion !== current.version) return null;
  return credentials.member;
}

export function createPreviewActions(repository: Repository, session: PreviewSession): AppActions {
  async function withMember<T>(run: (actor: Member) => Promise<ActionResult<T>>, { allowFirstLogin = false } = {}): Promise<ActionResult<T>> {
    const actor = await currentMemberOf(repository, session);
    if (!actor || (!actor.welcomedAt && !allowFirstLogin)) return { ok: false, message: SESSION_EXPIRED };
    try {
      return await run(actor);
    } catch (error) {
      return failure(error);
    }
  }

  return {
    async signIn(input) {
      try {
        const result = await members.authenticate(repository, { login: String(input?.login ?? ""), password: String(input?.password ?? "") });
        if (!result.ok) return { ok: false, message: result.message, errors: result.errors };
        const { member, sessionVersion } = result.credentials;
        await repository.updateMember(member.id, { lastLoginAt: clock().now });
        session.open(member.id, sessionVersion);
        return { ok: true, data: { next: member.welcomedAt ? "/" : "/bienvenue" } };
      } catch (error) {
        return failure(error);
      }
    },
    async signOut() {
      session.close();
    },
    completeWelcome: (input) => withMember((actor) => members.completeWelcome(repository, actor, input, clock().now), { allowFirstLogin: true }),

    addProspect: (input) => withMember((actor) => prospects.addProspect(repository, actor, input, clock())),
    deleteProspect: (id) => withMember((actor) => prospects.deleteProspect(repository, actor, String(id), clock().today)),
    async checkEstablishment(input) {
      return prospects.checkEstablishment(repository, String(input?.name ?? ""), String(input?.city ?? ""));
    },
    async searchDirectory(input) {
      return prospects.searchDirectory(repository, String(input?.query ?? ""), String(input?.city ?? ""));
    },

    saveResource: (input) => withMember((actor) => members.saveResource(repository, actor, input)),
    deleteResource: (id) => withMember((actor) => members.deleteResource(repository, actor, String(id))),
    saveMember: (input) => withMember((actor) => members.saveMember(repository, actor, input)),

    exportCsv: (input) =>
      withMember((actor) =>
        prospects.exportCsv(repository, actor, { month: String(input?.month ?? ""), kind: input?.kind === "prospects" ? "prospects" : "bilan" }, clock().today),
      ),
  };
}

