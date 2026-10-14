/**
 * Modèles de vue : ce que chaque écran affiche, calculé à partir des données
 * brutes. Fonctions pures, partagées par le site (côté serveur) et l'aperçu
 * interactif (côté navigateur) : les deux affichent exactement la même chose.
 * Tout est sérialisable (pas de Map ni de Date) pour passer du serveur au client.
 */
import { CHANNELS } from "./channels";
import { addDays, eachDay, endOfMonth, formatRelativeDay, monthKeyOf, periodWindow, startOfMonth, startOfWeek } from "./dates";
import { groupEstablishments, knownCities, type Establishment } from "./establishments";
import { EDITABLE_PAST_DAYS } from "./rules";
import { buildMonthReport, buildRanking, currentStreak, sumEntries, type MonthReport, type RankingRow } from "./stats";
import type { Channel, Contract, Entry, IsoDate, Member, Message, MonthKey, Period, Prospect, Resource } from "./types";

/** Nombre de prospections par membre et par jour, à partir des prospects. */
export function entriesFromProspects(prospects: readonly Prospect[]): Entry[] {
  const counts = new Map<string, Entry>();
  for (const prospect of prospects) {
    const key = `${prospect.memberId}|${prospect.date}`;
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else counts.set(key, { memberId: prospect.memberId, date: prospect.date, count: 1 });
  }
  return [...counts.values()];
}

/** Fenêtre de données nécessaire à chaque vue (le serveur ne charge que ça). */
export const DATA_WINDOWS = {
  /** Séries en cours et comparaisons : deux mois glissants suffisent. */
  history: (today: IsoDate) => ({ from: addDays(startOfMonth(monthKeyOf(today)), -40), to: today }),
  /** Classement : depuis le 1er janvier de l'année dernière (comparaison sur l'année). */
  ranking: (today: IsoDate) => ({ from: periodWindow("annee", today).previous.from, to: today }),
  month: (month: MonthKey) => ({ from: startOfMonth(month), to: endOfMonth(month) }),
};

export type MemberSummary = Pick<Member, "id" | "fullName" | "jobTitle" | "avatarUrl" | "isAdmin" | "isProspector" | "login">;

export const summarize = (member: Member): MemberSummary => ({
  id: member.id,
  fullName: member.fullName,
  jobTitle: member.jobTitle,
  avatarUrl: member.avatarUrl,
  isAdmin: member.isAdmin,
  isProspector: member.isProspector,
  login: member.login,
});

export type PodiumEntry = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  total: number;
  rank: number;
  isMe: boolean;
};

const visibleMembers = (members: readonly Member[]) => members.filter((member) => member.active);


const toPodium = (rows: RankingRow[], meId: string): PodiumEntry[] =>
  rows
    .filter((row) => row.total > 0)
    .slice(0, 3)
    .map((row) => ({
      id: row.member.id,
      fullName: row.member.fullName,
      avatarUrl: row.member.avatarUrl,
      total: row.total,
      rank: row.rank,
      isMe: row.member.id === meId,
    }));

/* ------------------------------------------------------------------ */
/* Accueil                                                              */
/* ------------------------------------------------------------------ */

export type HomeView = {
  today: IsoDate;
  me: MemberSummary;
};

/** L'accueil ne montre ni chiffres ni classement : seulement qui est connecté et la date. */
export function buildHomeView(input: { me: Member; today: IsoDate }): HomeView {
  return { today: input.today, me: summarize(input.me) };
}


/* ------------------------------------------------------------------ */
/* Prospection (ajout + mes derniers prospects)                         */
/* ------------------------------------------------------------------ */

export type ProspectRow = Prospect & { editable: boolean };

export type ProspectionView = {
  today: IsoDate;
  /** Jours sélectionnables pour une saisie (aujourd'hui puis les jours passés modifiables). */
  days: { value: IsoDate; label: string }[];
  cities: string[];
  todayCount: number;
  weekCount: number;
  streak: number;
  /** Mes prospects récents, du plus récent au plus ancien. */
  mine: ProspectRow[];
};

/** Prospects comptés dans les statistiques : ceux ajoutés depuis la dernière remise à zéro. */
export function countedSince<T extends { createdAt: string }>(prospects: T[], since: string | null): T[] {
  return since ? prospects.filter((prospect) => prospect.createdAt >= since) : prospects;
}

/**
 * Saisie : la liste « mes prospects » garde tout ce qui reste modifiable (on
 * peut corriger un ajout d'avant la remise à zéro) ; les compteurs, eux, partent
 * de la remise à zéro.
 */
export function buildProspectionView(input: { prospects: Prospect[]; me: Member; today: IsoDate; since?: string | null }): ProspectionView {
  const { prospects, me, today, since = null } = input;
  const oldestEditable = addDays(today, -EDITABLE_PAST_DAYS);
  const mine = prospects
    .filter((prospect) => prospect.memberId === me.id && prospect.date >= oldestEditable)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .map((prospect) => ({ ...prospect, editable: true }));
  const entries = entriesFromProspects(countedSince(prospects, since).filter((p) => p.memberId === me.id));

  return {
    today,
    days: eachDay({ from: oldestEditable, to: today })
      .reverse()
      .map((value) => ({ value, label: formatRelativeDay(value, today) })),
    cities: knownCities(prospects),
    todayCount: countedSince(mine, since).filter((prospect) => prospect.date === today).length,
    weekCount: sumEntries(entries, { from: startOfWeek(today), to: today }),
    streak: currentStreak(entries, me.id, today),
    mine,
  };
}

/* ------------------------------------------------------------------ */
/* Déjà contacté ? (annuaire des établissements)                        */
/* ------------------------------------------------------------------ */

export type DirectoryView = {
  today: IsoDate;
  totalEstablishments: number;
  contactedThisWeek: number;
  cities: string[];
  recent: Establishment[];
};

export function buildDirectoryView(input: {
  members: Member[];
  prospects: Prospect[];
  today: IsoDate;
  totalEstablishments?: number;
}): DirectoryView {
  const establishments = groupEstablishments(input.prospects, input.members);
  const weekStart = startOfWeek(input.today);
  return {
    today: input.today,
    totalEstablishments: input.totalEstablishments ?? establishments.length,
    contactedThisWeek: establishments.filter((e) => e.lastDate >= weekStart).length,
    cities: knownCities(input.prospects),
    recent: establishments.slice(0, 24),
  };
}

/* ------------------------------------------------------------------ */
/* Classement                                                          */
/* ------------------------------------------------------------------ */

export type PeriodRanking = {
  rows: RankingRow[];
  podium: PodiumEntry[];
  teamTotal: number;
  previousTeamTotal: number;
};

export type RankingView = {
  today: IsoDate;
  meId: string;
  meIsProspector: boolean;
  periods: Record<Period, PeriodRanking>;
  myStreak: number;
};

/** `entries` : prospects comptés par membre et par jour (déjà limités à ce qui compte dans les statistiques). */
export function buildRankingView(input: { members: Member[]; entries: Entry[]; me: Member; today: IsoDate }): RankingView {
  const members = visibleMembers(input.members);
  const { entries } = input;
  const period = (value: Period): PeriodRanking => {
    const window = periodWindow(value, input.today);
    const rows = buildRanking(members, entries, window.current, window.previous);
    return {
      rows,
      podium: toPodium(rows, input.me.id),
      teamTotal: sumEntries(entries, window.current),
      previousTeamTotal: sumEntries(entries, window.previous),
    };
  };
  return {
    today: input.today,
    meId: input.me.id,
    meIsProspector: input.me.isProspector,
    periods: { semaine: period("semaine"), mois: period("mois"), annee: period("annee") },
    myStreak: currentStreak(entries, input.me.id, input.today),
  };
}

/* ------------------------------------------------------------------ */
/* Bilan mensuel                                                       */
/* ------------------------------------------------------------------ */

export type ChannelShare = { channel: Channel; count: number };

export type ReportView = {
  today: IsoDate;
  meId: string;
  month: MonthKey;
  currentMonth: MonthKey;
  report: MonthReport;
  /** Dernier jour écoulé du mois affiché (aujourd'hui pour le mois en cours). */
  lastDay: IsoDate;
  channels: ChannelShare[];
  /** Répartition par moyen de contact pour chaque membre (même ordre que le bilan). */
  channelsByMember: Record<string, ChannelShare[]>;
};

function channelShares(prospects: readonly Prospect[]): ChannelShare[] {
  return CHANNELS.map(({ value }) => ({ channel: value, count: prospects.filter((p) => p.channel === value).length })).filter(
    (share) => share.count > 0,
  ).sort((a, b) => b.count - a.count);
}

export function buildReportView(input: {
  members: Member[];
  prospects: Prospect[];
  me: Member;
  month: MonthKey;
  today: IsoDate;
}): ReportView {
  const { month, today } = input;
  const inMonth = input.prospects.filter((p) => p.date >= startOfMonth(month) && p.date <= endOfMonth(month));
  const members = visibleMembers(input.members).concat(
    // Un membre désactivé reste dans le bilan des mois où il a prospecté.
    input.members.filter((m) => !m.active && inMonth.some((p) => p.memberId === m.id)),
  );
  const report = buildMonthReport(members, entriesFromProspects(inMonth), month);
  const currentMonth = monthKeyOf(today);
  return {
    today,
    meId: input.me.id,
    month,
    currentMonth,
    report,
    lastDay: month === currentMonth ? today : endOfMonth(month),
    channels: channelShares(inMonth),
    channelsByMember: Object.fromEntries(
      report.rows.map((row) => [row.member.id, channelShares(inMonth.filter((p) => p.memberId === row.member.id))]),
    ),
  };
}

/* ------------------------------------------------------------------ */
/* Équipe, ressources, administration                                  */
/* ------------------------------------------------------------------ */

/** Organigramme : qui fait quoi, sans chiffres (les totaux sont dans le bilan). */
export type TeamView = {
  meId: string;
  members: Member[];
};

export function buildTeamView(input: { members: Member[]; me: Member }): TeamView {
  return { meId: input.me.id, members: visibleMembers(input.members) };
}

export type ResourcesView = {
  canEdit: boolean;
  resources: Resource[];
};

export function buildResourcesView(input: { resources: Resource[]; me: Member }): ResourcesView {
  return {
    // Toute l'équipe gère « Mails et liens » (seuls identifiants et contrats sont réservés à l'admin).
    canEdit: true,
    resources: [...input.resources].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "fr")),
  };
}

export type AdminStats = {
  /** Instant de la dernière remise à zéro (`null` : jamais). */
  since: string | null;
  /** Commerces dans l'historique « déjà contacté ? » (jamais remis à zéro). */
  establishments: number;
  /** Prospects comptés ce mois-ci, depuis la remise à zéro. */
  countedThisMonth: number;
};

export type AdminView = {
  meId: string;
  members: Member[];
  departments: string[];
  stats: AdminStats;
};

export function buildAdminView(input: { members: Member[]; me: Member; stats: AdminStats }): AdminView {
  const members = [...input.members].sort(
    (a, b) => Number(b.active) - Number(a.active) || a.sortOrder - b.sortOrder || a.fullName.localeCompare(b.fullName, "fr"),
  );
  return {
    meId: input.me.id,
    members,
    departments: [...new Set(members.map((m) => m.department).filter((d): d is string => Boolean(d)))].sort(),
    stats: input.stats,
  };
}

export type ContractsView = {
  today: IsoDate;
  /** Gestion (ajout, avancement, suppression) réservée aux admins ; lecture pour tous. */
  canEdit: boolean;
  /** Membres actifs, pour « apporté par ». */
  members: { id: string; fullName: string }[];
  /** Tous les noms, y compris d'anciens membres, pour l'affichage. */
  names: Record<string, string>;
  inProgress: Contract[];
  done: Contract[];
  totals: { inProgress: number; done: number; signed: number; monthly: number };
};

/** Ordre des étapes d'un contrat en cours. */
export const CONTRACT_STEPS = ["maquette", "developpement", "validation", "termine"] as const;

export function buildContractsView(input: { contracts: Contract[]; members: Member[]; me: Member; today: IsoDate }): ContractsView {
  const step = (contract: Contract) => CONTRACT_STEPS.indexOf(contract.status);
  const inProgress = input.contracts
    .filter((contract) => contract.status !== "termine")
    .sort((a, b) => step(b) - step(a) || b.signedOn.localeCompare(a.signedOn));
  const done = input.contracts
    .filter((contract) => contract.status === "termine")
    .sort((a, b) => (b.deliveredOn ?? b.signedOn).localeCompare(a.deliveredOn ?? a.signedOn));
  return {
    today: input.today,
    canEdit: input.me.isAdmin,
    members: input.members
      .filter((member) => member.active)
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "fr"))
      .map(({ id, fullName }) => ({ id, fullName })),
    names: Object.fromEntries(input.members.map((member) => [member.id, member.fullName])),
    inProgress,
    done,
    totals: {
      inProgress: inProgress.length,
      done: done.length,
      signed: input.contracts.reduce((sum, contract) => sum + (contract.amount ?? 0), 0),
      // Abonnements en cours : ceux des sites déjà en ligne.
      monthly: done.reduce((sum, contract) => sum + (contract.monthly ?? 0), 0),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Échange                                                             */
/* ------------------------------------------------------------------ */

export type MessageRow = Message & {
  authorName: string;
  authorAvatarUrl: string | null;
  mine: boolean;
  /** L'auteur et les admins peuvent supprimer un message. */
  canDelete: boolean;
};

export type MessagesView = {
  meId: string;
  /** Instant du chargement : la vue la plus récente l'emporte à l'écran. */
  loadedAt: string;
  /** Du plus ancien au plus récent, comme dans une discussion. */
  messages: MessageRow[];
};

export function buildMessagesView(input: { messages: Message[]; members: Member[]; me: Member; now: string }): MessagesView {
  const byId = new Map(input.members.map((member) => [member.id, member]));
  const messages = [...input.messages]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((message) => {
      const author = byId.get(message.authorId);
      const mine = message.authorId === input.me.id;
      return {
        ...message,
        authorName: author?.fullName ?? "Ancien membre",
        authorAvatarUrl: author?.avatarUrl ?? null,
        mine,
        canDelete: mine || input.me.isAdmin,
      };
    });
  return { meId: input.me.id, loadedAt: input.now, messages };
}
