import type { Repository } from "../data/repository";
import { isMonthKey, monthKeyOf } from "../dates";
import type { IsoDate, LoginChoice, Member } from "../types";
import {
  buildAdminView,
  buildDirectoryView,
  buildHomeView,
  buildProspectionView,
  buildRankingView,
  buildReportView,
  buildResourcesView,
  buildTeamView,
  DATA_WINDOWS,
} from "../views";

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

async function historyData(repository: Repository, today: IsoDate) {
  const [members, prospects] = await Promise.all([
    repository.listMembers(),
    repository.listProspects(DATA_WINDOWS.history(today)),
  ]);
  return { members, prospects };
}

export async function loadHomeView(repository: Repository, me: Member, today: IsoDate) {
  const data = await historyData(repository, today);
  const view = buildHomeView({ ...data, me, today });
  return { ...view, establishmentsCount: await repository.countEstablishments() };
}

export async function loadProspectionView(repository: Repository, me: Member, today: IsoDate) {
  return buildProspectionView({ prospects: (await historyData(repository, today)).prospects, me, today });
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
  const [members, prospects] = await Promise.all([
    repository.listMembers(),
    repository.listProspects(DATA_WINDOWS.month(month)),
  ]);
  return buildReportView({ members, prospects, me, month, today });
}

export async function loadTeamView(repository: Repository, me: Member, today: IsoDate) {
  return buildTeamView({ ...(await historyData(repository, today)), me, today });
}

export async function loadResourcesView(repository: Repository, me: Member) {
  return buildResourcesView({ resources: await repository.listResources(), me });
}

export async function loadAdminView(repository: Repository, me: Member) {
  return buildAdminView({ members: await repository.listMembers(), me });
}
