import { ADMIN_ONLY, type ActionResult } from "../actions-contract";
import { isChannel } from "../channels";
import type { Repository } from "../data/repository";
import { todayIso } from "../dates";
import { contactFor, parseLead } from "../leads";
import type { IsoDate, Lead, Member, Prospect } from "../types";
import { prospectSchema } from "../validation";

type Clock = { today: IsoDate; now: string };

const GONE = "Ce commerce n'est plus dans la liste.";

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
    leads.push({ ...parsed.lead, id: crypto.randomUUID(), status: "open", doneBy: null, doneAt: null, prospectId: null, createdAt: options.now });
  });
  const archived = options.replace ? await repository.archiveOpenLeads() : 0;
  await repository.addLeads(leads);
  return { added: leads.length, archived, rejected };
}
