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
import * as contracts from "@/lib/services/contracts";
import * as callbacks from "@/lib/services/callbacks";
import * as mockups from "@/lib/services/mockups";
import * as leads from "@/lib/services/leads";
import { loadMessagesView } from "@/lib/services/loaders";
import * as members from "@/lib/services/members";
import * as messages from "@/lib/services/messages";
import * as prospects from "@/lib/services/prospects";
import type { Member } from "@/lib/types";
import type { PreviewSession } from "./session";

const READ_ONLY = "Ton accès à cet aperçu est en lecture seule : demande à son propriétaire de t'ajouter comme contributeur.";
const STORAGE_FULL = "Le stockage de l'aperçu est plein : supprime quelques éléments puis réessaie.";
const FILES_UNAVAILABLE = "L'envoi de fichiers n'est pas disponible avec ton accès à l'aperçu : tu peux envoyer du texte.";
const FILE_TYPE_REFUSED = "Dans l'aperçu, seuls les photos, les PDF et les fichiers texte peuvent être envoyés (Word, Excel et PowerPoint le seront sur le site).";

/** Message lisible pour une écriture refusée par la base partagée. */
function failure(error: unknown): ActionResult<never> {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
  if (code === "invalid_argument" || code === "not_granted") return { ok: false, message: READ_ONLY };
  if (code === "quota_exceeded" || code === "quota_or_state") return { ok: false, message: STORAGE_FULL };
  if (code === "files_unavailable" || code === "capability_disabled" || code === "capability_removed") return { ok: false, message: FILES_UNAVAILABLE };
  if (code === "unsupported_type") return { ok: false, message: FILE_TYPE_REFUSED };
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
    analyzeImport: (rows) => withMember(() => prospects.analyzeImport(repository, rows, clock().today)),
    importProspects: (input) =>
      withMember((actor) => prospects.importProspects(repository, actor, { rows: input?.rows, includeKnown: input?.includeKnown }, clock())),
    async checkEstablishment(input) {
      return prospects.checkEstablishment(repository, String(input?.name ?? ""), String(input?.city ?? ""));
    },
    async searchDirectory(input) {
      return prospects.searchDirectory(repository, String(input?.query ?? ""), String(input?.city ?? ""));
    },

    claimLead: (input) => withMember((actor) => leads.claimLead(repository, actor, { id: input?.id, channel: input?.channel }, clock())),
    releaseLead: (id) => withMember((actor) => leads.releaseLead(repository, actor, id, clock())),
    deleteLead: (id) => withMember((actor) => leads.deleteLead(repository, actor, id)),
    addLead: (input) =>
      withMember(async (actor) => {
        const result = await leads.addLead(repository, actor, input, clock());
        return result.ok ? { ok: true as const, data: { id: result.data.lead.id }, message: result.message } : result;
      }),
    importLeads: (rows) => withMember((actor) => leads.importLeads(repository, actor, rows, clock())),
    deferLead: (input) => withMember((actor) => leads.deferLead(repository, actor, { id: input?.id, callback: input?.callback }, clock())),
    extractBatch: (input) => withMember((actor) => leads.extractBatch(repository, actor, input?.size, clock())),
    handleBatchLead: (input) =>
      withMember((actor) => leads.handleBatchLead(repository, actor, { id: input?.id, outcome: input?.outcome, callback: input?.callback }, clock())),
    finishBatch: () => withMember((actor) => leads.finishBatch(repository, actor, clock())),
    releaseBatch: (id) => withMember((actor) => leads.releaseBatch(repository, actor, id)),
    addCallback: (input) =>
      withMember(async (actor) => {
        const result = await callbacks.addCallback(repository, actor, input, clock());
        return result.ok ? { ok: true as const, data: null, message: result.message } : result;
      }),
    completeCallback: (id) => withMember((actor) => callbacks.completeCallback(repository, actor, id, clock())),
    reopenCallback: (id) => withMember((actor) => callbacks.reopenCallback(repository, actor, id)),
    rescheduleCallback: (input) =>
      withMember((actor) => callbacks.rescheduleCallback(repository, actor, { id: input?.id, dueOn: input?.dueOn, dueTime: input?.dueTime, priority: input?.priority }, clock())),
    updateCallback: (input) => withMember((actor) => callbacks.updateCallback(repository, actor, input, clock())),
    deleteCallback: (id) => withMember((actor) => callbacks.deleteCallback(repository, actor, id)),

    saveResource: (input) => withMember((actor) => members.saveResource(repository, actor, input)),
    deleteResource: (id) => withMember((actor) => members.deleteResource(repository, actor, String(id))),
    saveMember: (input) => withMember((actor) => members.saveMember(repository, actor, input)),
    saveContract: (input) => withMember((actor) => contracts.saveContract(repository, actor, input, clock())),
    deleteContract: (id) => withMember((actor) => contracts.deleteContract(repository, actor, String(id))),
    saveMockup: (input) => withMember((actor) => mockups.saveMockup(repository, actor, input, clock())),
    deleteMockup: (id) => withMember((actor) => mockups.deleteMockup(repository, actor, String(id))),
    resetStatistics: (input) => withMember((actor) => members.resetStatistics(repository, actor, String(input?.confirmation ?? ""), clock().now)),

    async listMessages(channel) {
      const actor = await currentMemberOf(repository, session);
      if (!actor?.welcomedAt) return null;
      return loadMessagesView(repository, actor, clock().now, channel);
    },
    uploadAttachment: (form) =>
      withMember((actor) => messages.uploadAttachment(repository, actor, form instanceof FormData ? form.get("file") : null, clock().now)),
    discardAttachment: (id) => withMember((actor) => messages.discardAttachment(repository, actor, String(id))),
    sendMessage: (input) =>
      withMember((actor) =>
        messages.sendMessage(repository, actor, { text: input?.text, attachmentIds: input?.attachmentIds, channel: input?.channel, replyTo: input?.replyTo }, clock().now),
      ),
    toggleReaction: (input) => withMember((actor) => messages.toggleReaction(repository, actor, { id: input?.id, emoji: input?.emoji })),
    togglePin: (id) => withMember((actor) => messages.togglePin(repository, actor, String(id))),
    deleteMessage: (id) => withMember((actor) => messages.deleteMessage(repository, actor, String(id))),
    async callbacksDue() {
      const actor = await currentMemberOf(repository, session);
      if (!actor?.welcomedAt) return 0;
      return callbacks.callbacksDue(repository, clock());
    },
    async chatStatus() {
      const actor = await currentMemberOf(repository, session);
      if (!actor?.welcomedAt) return { latestAt: null, latestAuthorId: null };
      return messages.chatStatus(repository);
    },

    exportCsv: (input) =>
      withMember((actor) =>
        prospects.exportCsv(repository, actor, { month: String(input?.month ?? ""), kind: input?.kind === "prospects" ? "prospects" : "bilan" }, clock().today),
      ),
  };
}

