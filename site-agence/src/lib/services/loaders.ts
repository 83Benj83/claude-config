import type { Repository } from "../data/repository";
import { isMonthKey, monthKeyOf } from "../dates";
import type { IsoDate, LoginChoice, Member } from "../types";
import {
  buildAdminView,
  buildContractsView,
  buildDirectoryView,
  buildHomeView,
  buildProspectionView,
  buildRankingView,
  buildReportView,
  buildResourcesView,
  buildTeamView,
  countedSince,
  DATA_WINDOWS,
} from "../views";

export { countedSince };

/**
 * Chargement des données de chaque écran : seule la fenêtre utile est lue,
 * puis le modèle de vue est calculé. Communs au site et à l'aperçu.
 */

/** Derniers prospects lus pour l'annuaire (les plus récents d'abord). */
const DIRECTORY_RECENT = 600;

export async function loadLoginChoices(repository: Repository): Promise<LoginChoice[]> {
  const members = await repository.listMembers();
  return members
    .filter((member) => member.active)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "fr"))
    .map(({ id, login, fullName, avatarUrl }) => ({ id, login, fullName, avatarUrl }));
}

/** Membres et prospects récents, limités à ce qui compte dans les statistiques. */
async function historyData(repository: Repository, today: IsoDate) {
  const [members, prospects, since] = await Promise.all([
    repository.listMembers(),
    repository.listProspects(DATA_WINDOWS.history(today)),
    repository.getStatsSince(),
  ]);
  return { members, prospects: countedSince(prospects, since) };
}

export function loadHomeView(me: Member, today: IsoDate) {
  return buildHomeView({ me, today });
}

export async function loadProspectionView(repository: Repository, me: Member, today: IsoDate) {
  const [prospects, since] = await Promise.all([repository.listProspects(DATA_WINDOWS.history(today)), repository.getStatsSince()]);
  return buildProspectionView({ prospects, since, me, today });
}

export async function loadDirectoryView(repository: Repository, today: IsoDate) {
  const [members, prospects, total] = await Promise.all([
    repository.listMembers(),
    repository.listRecentProspects(DIRECTORY_RECENT),
    repository.countEstablishments(),
  ]);
  return buildDirectoryView({ members, prospects, today, totalEstablishments: total });
}

export async function loadRankingView(repository: Repository, me: Member, today: IsoDate) {
  return buildRankingView({ ...(await historyData(repository, today)), me, today });
}

export async function loadReportView(repository: Repository, me: Member, today: IsoDate, requestedMonth: unknown) {
  const current = monthKeyOf(today);
  const month = isMonthKey(requestedMonth) && requestedMonth <= current ? requestedMonth : current;
  const [members, prospects, since] = await Promise.all([
    repository.listMembers(),
    repository.listProspects(DATA_WINDOWS.month(month)),
    repository.getStatsSince(),
  ]);
  return buildReportView({ members, prospects: countedSince(prospects, since), me, month, today });
}

export async function loadTeamView(repository: Repository, me: Member) {
  return buildTeamView({ members: await repository.listMembers(), me });
}

export async function loadContractsView(repository: Repository, me: Member, today: IsoDate) {
  const [contracts, members] = await Promise.all([repository.listContracts(), repository.listMembers()]);
  return buildContractsView({ contracts, members, me, today });
}

export async function loadResourcesView(repository: Repository, me: Member) {
  return buildResourcesView({ resources: await repository.listResources(), me });
}

export async function loadAdminView(repository: Repository, me: Member, today: IsoDate) {
  const [members, since, establishments, month] = await Promise.all([
    repository.listMembers(),
    repository.getStatsSince(),
    repository.countEstablishments(),
    repository.listProspects(DATA_WINDOWS.month(monthKeyOf(today))),
  ]);
  return buildAdminView({ members, me, stats: { since, establishments, countedThisMonth: countedSince(month, since).length } });
}
