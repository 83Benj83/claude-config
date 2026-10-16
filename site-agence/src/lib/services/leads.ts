import { ADMIN_ONLY, type ActionResult } from "../actions-contract";
import { isChannel } from "../channels";
import type { Repository } from "../data/repository";
import { todayIso } from "../dates";
import { contactFor, parseLead } from "../leads";
import { BATCH_SIZES } from "../rules";
import { nameKey } from "../establishments";
import type { IsoDate, Lead, LeadBatch, Member, Prospect } from "../types";
import { addCallback } from "./callbacks";
import { prospectSchema } from "../validation";

type Clock = { today: IsoDate; now: string };

const GONE = "Ce commerce n'est plus dans la liste.";
const RESERVED = "Ce commerce est dans le fichier d'un collègue.";

/**
 * Coche un commerce de la liste « À contacter » : il quitte la liste pour
 * tout le monde et devient un prospect du jour de la personne.
 */
export async function claimLead(
  repository: Repository,
  actor: Member,
  input: { id: unknown; channel: unknown },
  clock: Clock,
): Promise<ActionResult<{ prospect: Prospect }>> {
  const lead = await repository.getLead(String(input?.id ?? ""));
  if (!lead || lead.status === "archived") return { ok: false, message: GONE };
  if (lead.batchId) return { ok: false, message: RESERVED };
  if (lead.status === "done") return { ok: false, message: await alreadyTicked(repository, lead) };
  if (!isChannel(input?.channel)) return { ok: false, message: "Choisis comment tu l'as contacté." };

  const parsed = prospectSchema.safeParse({
    name: lead.name,
    city: lead.city,
    channel: input.channel,
    contact: contactFor(lead, input.channel) ?? "",
    note: lead.note ?? "",
    date: clock.today,
  });
  if (!parsed.success) return { ok: false, message: "Ce commerce ne peut pas devenir un prospect : préviens un admin." };

  const prospect: Prospect = { id: crypto.randomUUID(), memberId: actor.id, ...parsed.data, createdAt: clock.now };
  // La coche d'abord (une seule personne gagne), puis le prospect ; en cas d'échec, le commerce revient dans la liste.
  if (!(await repository.claimLead(lead.id, actor.id, clock.now, prospect.id))) {
    const current = await repository.getLead(lead.id);
    return { ok: false, message: current?.status === "done" ? await alreadyTicked(repository, current) : GONE };
  }
  try {
    await repository.addProspect(prospect);
  } catch (error) {
    await repository.reopenLead(lead.id);
    throw error;
  }
  return { ok: true, data: { prospect }, message: `${lead.name} ajouté à tes prospects du jour.` };
}

async function alreadyTicked(repository: Repository, lead: Lead): Promise<string> {
  const by = (await repository.listMembers()).find((member) => member.id === lead.doneBy);
  return `${by?.fullName ?? "Quelqu'un"} l'a déjà coché.`;
}

/** Annule une coche : le commerce revient dans la liste et le prospect créé est retiré. */
export async function releaseLead(repository: Repository, actor: Member, id: unknown, clock: Clock): Promise<ActionResult> {
  const lead = await repository.getLead(String(id ?? ""));
  if (!lead || lead.status !== "done") return { ok: false, message: "Ce commerce n'est pas coché." };
  if (!actor.isAdmin) {
    if (lead.doneBy !== actor.id) return { ok: false, message: "Seule la personne qui l'a coché peut annuler." };
    if (!lead.doneAt || todayIso(new Date(lead.doneAt)) !== clock.today) return { ok: false, message: "Une coche ne s'annule que le jour même." };
  }
  if (lead.prospectId) await repository.deleteProspect(lead.prospectId);
  await repository.reopenLead(lead.id);
  return { ok: true, data: null, message: `${lead.name} est de retour dans la liste.` };
}

/** Chaque membre peut ajouter un numéro à contacter : nom, ville et téléphone obligatoires. */
export async function addLead(repository: Repository, actor: Member, input: unknown, clock: Clock): Promise<ActionResult<{ lead: Lead }>> {
  const parsed = parseLead(input, clock.today);
  if (!parsed.ok) return { ok: false, message: parsed.message };
  if (!parsed.lead.phone) return { ok: false, errors: { phone: "Indique un numéro de téléphone valide." }, message: "Indique un numéro de téléphone valide." };
  const key = nameKey(parsed.lead.name);
  const existing = (await repository.listLeads(clock.now)).find((l) => l.status === "open" && nameKey(l.name) === key && l.city.toLowerCase() === parsed.lead.city.toLowerCase());
  if (existing) return { ok: false, message: `${existing.name} (${existing.city}) est déjà dans la liste.` };
  const lead: Lead = { ...parsed.lead, id: crypto.randomUUID(), status: "open", doneBy: null, doneAt: null, prospectId: null, addedBy: actor.id, batchId: null, outcome: null, createdAt: clock.now };
  await repository.addLeads([lead]);
  return { ok: true, data: { lead }, message: `${lead.name} ajouté à la liste « À contacter ».` };
}

/** « À rappeler plus tard » : le commerce quitte la liste et rejoint les rappels de l'équipe. */
export async function deferLead(repository: Repository, actor: Member, input: { id: unknown; callback: unknown }, clock: Clock): Promise<ActionResult> {
  const lead = await repository.getLead(String(input?.id ?? ""));
  if (!lead || lead.status !== "open") return { ok: false, message: GONE };
  if (lead.batchId) return { ok: false, message: RESERVED };
  const created = await addCallback(repository, actor, input.callback, clock, lead.id);
  if (!created.ok) return created;
  if (!(await repository.deferLead(lead.id, actor.id, clock.now))) {
    await repository.deleteCallback(created.data.callback.id);
    return { ok: false, message: GONE };
  }
  return { ok: true, data: null, message: `${lead.name} est dans les rappels.` };
}

/* ------------------------------------------------------------------ */
/* Fichiers de 10 à 50 commerces                                       */
/* ------------------------------------------------------------------ */

async function myBatch(repository: Repository, actor: Member): Promise<LeadBatch | null> {
  return (await repository.listActiveBatches()).find((batch) => batch.memberId === actor.id) ?? null;
}

/** Extrait un fichier : les commerces disparaissent de la liste des autres jusqu'à la clôture. */
export async function extractBatch(repository: Repository, actor: Member, size: unknown, clock: Clock): Promise<ActionResult<{ count: number }>> {
  if (!BATCH_SIZES.some((allowed) => allowed === size)) return { ok: false, message: "Choisis 10, 20, 30, 40 ou 50 commerces." };
  if (await myBatch(repository, actor)) return { ok: false, message: "Tu as déjà un fichier en cours : termine-le (ou rends-le) avant d'en extraire un autre." };
  const batch: LeadBatch = { id: crypto.randomUUID(), memberId: actor.id, size: size as number, createdAt: clock.now, finishedAt: null };
  const created = await repository.createBatch(batch, size as number);
  if (!created) return { ok: false, message: "Tu as déjà un fichier en cours." };
  if (created.leads.length === 0) {
    await repository.releaseBatch(batch.id);
    return { ok: false, message: "Il n'y a plus de commerce disponible dans la liste." };
  }
  const count = created.leads.length;
  return {
    ok: true,
    data: { count },
    message: count < (size as number) ? `Seulement ${count} commerces disponibles : ils sont à toi.` : `${count} commerces extraits : ils sont à toi.`,
  };
}

/** Appelé (compté à la clôture du fichier) ou à rappeler plus tard (détails demandés). */
export async function handleBatchLead(
  repository: Repository,
  actor: Member,
  input: { id: unknown; outcome: unknown; callback?: unknown },
  clock: Clock,
): Promise<ActionResult> {
  const lead = await repository.getLead(String(input?.id ?? ""));
  const batch = await myBatch(repository, actor);
  if (!lead || !batch || lead.batchId !== batch.id || lead.status !== "open") return { ok: false, message: "Ce commerce n'est pas dans ton fichier." };
  if (input.outcome === "contacted") {
    await repository.setLeadOutcome(lead.id, "contacted");
    return { ok: true, data: null, message: `${lead.name} : appelé.` };
  }
  if (input.outcome === "callback") {
    if (lead.outcome === "callback") return { ok: true, data: null, message: `${lead.name} est déjà dans les rappels.` };
    const created = await addCallback(repository, actor, input.callback, clock, lead.id);
    if (!created.ok) return created;
    await repository.setLeadOutcome(lead.id, "callback");
    return { ok: true, data: null, message: `${lead.name} est dans les rappels.` };
  }
  if (input.outcome === null || input.outcome === "none") {
    await repository.setLeadOutcome(lead.id, null);
    return { ok: true, data: null, message: `${lead.name} : à traiter.` };
  }
  return { ok: false, message: "Choisis « Effectué » ou « À rappeler plus tard »." };
}

/** Clôture : possible quand tout le fichier est traité ; les appelés rejoignent « déjà contactés » et le classement. */
export async function finishBatch(repository: Repository, actor: Member, clock: Clock): Promise<ActionResult<{ counted: number }>> {
  const batch = await myBatch(repository, actor);
  if (!batch) return { ok: false, message: "Tu n'as pas de fichier en cours." };
  const leads = await repository.listBatchLeads(batch.id);
  const pending = leads.filter((l) => l.status === "open" && !l.outcome).length;
  if (pending > 0) return { ok: false, message: `Il reste ${pending} commerce${pending > 1 ? "s" : ""} à traiter dans ton fichier.` };
  const toCount = leads.filter((l) => l.status === "open" && l.outcome === "contacted");
  const created: { leadId: string; prospect: Prospect }[] = [];
  const prospects: Prospect[] = [];
  for (const lead of toCount) {
    const parsed = prospectSchema.safeParse({ name: lead.name, city: lead.city, channel: "telephone", contact: lead.phone ?? "", note: lead.note ?? "", date: clock.today });
    if (!parsed.success) continue;
    const prospect: Prospect = { id: crypto.randomUUID(), memberId: actor.id, ...parsed.data, createdAt: clock.now };
    prospects.push(prospect);
    created.push({ leadId: lead.id, prospect });
  }
  if (!(await repository.finishBatch(batch.id, actor.id, clock.now, created))) {
    return { ok: false, message: "Ce fichier est déjà terminé." };
  }
  return { ok: true, data: { counted: prospects.length }, message: `Fichier terminé : ${prospects.length} commerce${prospects.length > 1 ? "s" : ""} ajouté${prospects.length > 1 ? "s" : ""} à tes prospects.` };
}

/** Rend le fichier : ce qui n'est pas traité revient dans la liste (le propriétaire ou un admin). */
export async function releaseBatch(repository: Repository, actor: Member, batchId: unknown): Promise<ActionResult> {
  const batch = (await repository.listActiveBatches()).find((b) => b.id === String(batchId ?? ""));
  if (!batch) return { ok: false, message: "Ce fichier n'existe plus." };
  if (batch.memberId !== actor.id && !actor.isAdmin) return { ok: false, message: "Seule la personne qui l'a extrait (ou un admin) peut le rendre." };
  const leads = await repository.listBatchLeads(batch.id);
  if (leads.some((l) => l.status === "open" && l.outcome)) {
    return { ok: false, message: "Des commerces sont déjà traités : termine le fichier plutôt que de le rendre." };
  }
  const back = await repository.releaseBatch(batch.id);
  return { ok: true, data: null, message: `${back} commerce${back > 1 ? "s" : ""} de retour dans la liste.` };
}

/** Retire un commerce de la liste (admin). */
export async function deleteLead(repository: Repository, actor: Member, id: unknown): Promise<ActionResult> {
  if (!actor.isAdmin) return { ok: false, message: ADMIN_ONLY };
  const lead = await repository.getLead(String(id ?? ""));
  if (!lead) return { ok: false, message: GONE };
  await repository.deleteLead(lead.id);
  return { ok: true, data: null, message: `${lead.name} retiré de la liste.` };
}

/**
 * Nouvelle liste (script d'ajout) : chaque ligne est vérifiée ; avec `replace`,
 * les commerces encore à contacter de l'ancienne liste sont rangés.
 */
export async function addLeadList(
  repository: Repository,
  rows: unknown[],
  options: { listDay: IsoDate; now: string; replace: boolean },
): Promise<{ added: number; archived: number; rejected: { line: number; message: string }[] }> {
  const rejected: { line: number; message: string }[] = [];
  const leads: Lead[] = [];
  rows.forEach((row, index) => {
    const parsed = parseLead(row, options.listDay);
    if (!parsed.ok) {
      rejected.push({ line: index + 1, message: parsed.message });
      return;
    }
    leads.push({ ...parsed.lead, id: crypto.randomUUID(), status: "open", doneBy: null, doneAt: null, prospectId: null, addedBy: null, batchId: null, outcome: null, createdAt: options.now });
  });
  const archived = options.replace ? await repository.archiveOpenLeads() : 0;
  await repository.addLeads(leads);
  return { added: leads.length, archived, rejected };
}
