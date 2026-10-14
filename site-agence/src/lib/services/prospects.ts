import { GENERIC_ERROR, type ActionResult, type CsvExport, type ProspectFormValues } from "../actions-contract";
import { monthReportToCsv, prospectsToCsv } from "../csv";
import type { Repository } from "../data/repository";
import { endOfMonth, isMonthKey, monthKeyOf, startOfMonth } from "../dates";
import {
  checkDuplicate,
  groupEstablishments,
  searchEstablishments,
  searchTokens,
  type DuplicateCheck,
  type Establishment,
} from "../establishments";
import { analyzeRows, establishmentKey, sanitizeRows, type RowStatus } from "../prospect-import";
import { EDITABLE_PAST_DAYS } from "../rules";
import { buildReportView, countedSince } from "../views";
import type { IsoDate, Member, Prospect } from "../types";
import { fieldErrors, isEditableDate, prospectSchema } from "../validation";

/**
 * Règles métier des prospects, communes au site et à l'aperçu.
 * `actor` est le membre connecté, déjà authentifié par l'appelant.
 */

export async function addProspect(
  repository: Repository,
  actor: Member,
  input: ProspectFormValues,
  clock: { today: IsoDate; now: string },
): Promise<ActionResult<{ prospect: Prospect; todayCount: number }>> {
  const parsed = prospectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  if (!isEditableDate(parsed.data.date, clock.today)) {
    return { ok: false, errors: { date: `Tu peux saisir aujourd'hui et les ${EDITABLE_PAST_DAYS} derniers jours.` } };
  }

  const prospect: Prospect = {
    id: crypto.randomUUID(),
    memberId: actor.id,
    ...parsed.data,
    createdAt: clock.now,
  };
  await repository.addProspect(prospect);
  const [today, since] = await Promise.all([repository.listProspects({ from: clock.today, to: clock.today }), repository.getStatsSince()]);
  const counted = since ? today.filter((p) => p.createdAt >= since) : today;
  return {
    ok: true,
    data: { prospect, todayCount: counted.filter((p) => p.memberId === actor.id).length },
    message: `${prospect.name} ajouté.`,
  };
}

/** Établissements déjà contactés par l'équipe (tout l'historique, comme « Déjà contacté ? »). */
async function knownEstablishments(repository: Repository): Promise<Set<string>> {
  return new Set((await repository.listProspects()).map((prospect) => establishmentKey(prospect.name, prospect.city)));
}

/** Aperçu d'un import : verdict de chaque ligne, sans rien enregistrer. */
export async function analyzeImport(repository: Repository, input: unknown, today: IsoDate): Promise<ActionResult<RowStatus[]>> {
  const rows = sanitizeRows(input);
  if (!rows) return { ok: false, message: "La liste est vide ou dépasse 500 lignes." };
  return { ok: true, data: analyzeRows(rows, await knownEstablishments(repository), today) };
}

/**
 * Import d'une liste : chaque ligne est revérifiée ici. Les lignes à corriger
 * et les doublons du fichier sont ignorés ; les commerces déjà contactés
 * aussi, sauf demande explicite.
 */
export async function importProspects(
  repository: Repository,
  actor: Member,
  input: { rows: unknown; includeKnown: unknown },
  clock: { today: IsoDate; now: string },
): Promise<ActionResult<{ added: number; skipped: number }>> {
  const rows = sanitizeRows(input?.rows);
  if (!rows) return { ok: false, message: "La liste est vide ou dépasse 500 lignes." };
  const statuses = analyzeRows(rows, await knownEstablishments(repository), clock.today);
  const start = Date.parse(clock.now);
  const prospects: Prospect[] = rows.flatMap((row, index) => {
    const status = statuses[index].status;
    if (status !== "ready" && !(status === "known" && input.includeKnown === true)) return [];
    const parsed = prospectSchema.parse(row);
    // Une milliseconde d'écart par ligne : l'ordre du fichier est gardé.
    return [{ id: crypto.randomUUID(), memberId: actor.id, ...parsed, createdAt: new Date(start + index).toISOString() }];
  });
  if (prospects.length === 0) return { ok: false, message: "Aucune ligne à ajouter : toutes sont à corriger ou déjà contactées." };

  await repository.addProspects(prospects);
  const skipped = rows.length - prospects.length;
  return {
    ok: true,
    data: { added: prospects.length, skipped },
    message: `${prospects.length} prospect${prospects.length > 1 ? "s" : ""} ajouté${prospects.length > 1 ? "s" : ""}${skipped ? `, ${skipped} ignoré${skipped > 1 ? "s" : ""}` : ""}.`,
  };
}

export async function deleteProspect(
  repository: Repository,
  actor: Member,
  id: string,
  today: IsoDate,
): Promise<ActionResult> {
  const prospect = await repository.getProspect(id);
  if (!prospect) return { ok: false, message: "Ce prospect n'existe plus." };
  const ownsIt = prospect.memberId === actor.id;
  if (!actor.isAdmin && (!ownsIt || !isEditableDate(prospect.date, today))) {
    return { ok: false, message: `Tu peux supprimer tes propres prospects des ${EDITABLE_PAST_DAYS} derniers jours.` };
  }
  await repository.deleteProspect(id);
  return { ok: true, data: null, message: `${prospect.name} supprimé.` };
}

/** Établissements dont le nom contient le mot le plus distinctif de la recherche. */
async function candidates(repository: Repository, text: string): Promise<Establishment[]> {
  const tokens = searchTokens(text);
  if (tokens.length === 0) return [];
  const longest = [...tokens].sort((a, b) => b.length - a.length)[0];
  const [prospects, members] = await Promise.all([repository.findProspectsByNameToken(longest), repository.listMembers()]);
  return groupEstablishments(prospects, members);
}

export async function checkEstablishment(repository: Repository, name: string, city: string): Promise<DuplicateCheck> {
  return checkDuplicate(await candidates(repository, name), name, city);
}

export async function searchDirectory(repository: Repository, query: string, city: string): Promise<Establishment[]> {
  return searchEstablishments(await candidates(repository, query), query, city);
}

export async function exportCsv(
  repository: Repository,
  actor: Member,
  input: { month: string; kind: "bilan" | "prospects" },
  today: IsoDate,
): Promise<ActionResult<CsvExport>> {
  const month = isMonthKey(input.month) && input.month <= monthKeyOf(today) ? input.month : monthKeyOf(today);
  try {
    const [members, prospects, since] = await Promise.all([
      repository.listMembers(),
      repository.listProspects({ from: startOfMonth(month), to: endOfMonth(month) }),
      repository.getStatsSince(),
    ]);
    // La liste brute garde tout ; le bilan reprend les chiffres de l'écran (depuis la remise à zéro).
    if (input.kind === "prospects") {
      return { ok: true, data: { filename: `prospects-${month}.csv`, content: prospectsToCsv(prospects, members) } };
    }
    const view = buildReportView({ members, prospects: countedSince(prospects, since), me: actor, month, today });
    return { ok: true, data: { filename: `bilan-prospection-${month}.csv`, content: monthReportToCsv(view.report) } };
  } catch (error) {
    console.error("[exportCsv]", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}
