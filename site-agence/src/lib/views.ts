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
import { buildMonthReport, buildRanking, currentStreak, sumEntries, totalsByMember, type MonthReport, type RankingRow } from "./stats";
import type { Channel, Entry, IsoDate, Member, MonthKey, Period, Prospect, Resource } from "./types";

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

export type FeedItem = {
  id: string;
  name: string;
  city: string;
  channel: Channel;
  date: IsoDate;
  memberName: string;
  memberAvatarUrl: string | null;
};

const visibleMembers = (members: readonly Member[]) => members.filter((member) => member.active);

function feed(prospects: readonly Prospect[], members: readonly Member[], limit: number): FeedItem[] {
  const byId = new Map(members.map((member) => [member.id, member]));
  return [...prospects]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map((prospect) => ({
      id: prospect.id,
      name: prospect.name,
      city: prospect.city,
      channel: prospect.channel,
      date: prospect.date,
      memberName: byId.get(prospect.memberId)?.fullName ?? "Ancien membre",
      memberAvatarUrl: byId.get(prospect.memberId)?.avatarUrl ?? null,
    }));
}

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
  myToday: number;
  myStreak: number;
  myRank: number | null;
  prospectorCount: number;
  enteredToday: number;
  team: { today: number; week: number; month: number };
  podium: PodiumEntry[];
  trend: { date: IsoDate; total: number }[];
  feed: FeedItem[];
  establishmentsCount: number;
};

const TREND_DAYS = 14;

export function buildHomeView(input: { members: Member[]; prospects: Prospect[]; me: Member; today: IsoDate }): HomeView {
  const { prospects, me, today } = input;
  const members = visibleMembers(input.members);
  const entries = entriesFromProspects(prospects);
  const day = { from: today, to: today };
  const ranking = buildRanking(members, entries, day, { from: addDays(today, -1), to: addDays(today, -1) });
  const dailyTotals = totalsByDay(entries);

  return {
    today,
    me: summarize(me),
    myToday: sumEntries(entries.filter((e) => e.memberId === me.id), day),
    myStreak: currentStreak(entries, me.id, today),
    myRank: ranking.find((row) => row.member.id === me.id)?.rank ?? null,
    prospectorCount: ranking.length,
    enteredToday: ranking.filter((row) => row.hasEntry).length,
    team: {
      today: sumEntries(entries, day),
      week: sumEntries(entries, { from: startOfWeek(today), to: today }),
      month: sumEntries(entries, { from: startOfMonth(monthKeyOf(today)), to: today }),
    },
    podium: toPodium(ranking, me.id),
    trend: eachDay({ from: addDays(today, -(TREND_DAYS - 1)), to: today }).map((date) => ({
      date,
      total: dailyTotals.get(date) ?? 0,
    })),
    feed: feed(prospects, input.members, 6),
    establishmentsCount: groupEstablishments(prospects, input.members).length,
  };
}

function totalsByDay(entries: readonly Entry[]): Map<IsoDate, number> {
  const totals = new Map<IsoDate, number>();
  for (const entry of entries) totals.set(entry.date, (totals.get(entry.date) ?? 0) + entry.count);
  return totals;
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

export function buildProspectionView(input: { prospects: Prospect[]; me: Member; today: IsoDate }): ProspectionView {
  const { prospects, me, today } = input;
  const oldestEditable = addDays(today, -EDITABLE_PAST_DAYS);
  const mine = prospects
    .filter((prospect) => prospect.memberId === me.id && prospect.date >= oldestEditable)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .map((prospect) => ({ ...prospect, editable: true }));
  const entries = entriesFromProspects(prospects.filter((p) => p.memberId === me.id));

  return {
    today,
    days: eachDay({ from: oldestEditable, to: today })
      .reverse()
      .map((value) => ({ value, label: formatRelativeDay(value, today) })),
    cities: knownCities(prospects),
    todayCount: mine.filter((prospect) => prospect.date === today).length,
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

export function buildRankingView(input: { members: Member[]; prospects: Prospect[]; me: Member; today: IsoDate }): RankingView {
  const members = visibleMembers(input.members);
  const entries = entriesFromProspects(input.prospects);
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
    periods: { jour: period("jour"), semaine: period("semaine"), mois: period("mois") },
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

export type TeamView = {
  meId: string;
  members: Member[];
  monthTotals: Record<string, number>;
};

export function buildTeamView(input: { members: Member[]; prospects: Prospect[]; me: Member; today: IsoDate }): TeamView {
  const totals = totalsByMember(entriesFromProspects(input.prospects), {
    from: startOfMonth(monthKeyOf(input.today)),
    to: input.today,
  });
  return {
    meId: input.me.id,
    members: visibleMembers(input.members),
    monthTotals: Object.fromEntries(totals),
  };
}

export type ResourcesView = {
  canEdit: boolean;
  resources: Resource[];
};

export function buildResourcesView(input: { resources: Resource[]; me: Member }): ResourcesView {
  return {
    canEdit: input.me.isAdmin,
    resources: [...input.resources].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "fr")),
  };
}

export type AdminView = {
  meId: string;
  members: Member[];
  departments: string[];
};

export function buildAdminView(input: { members: Member[]; me: Member }): AdminView {
  const members = [...input.members].sort(
    (a, b) => Number(b.active) - Number(a.active) || a.sortOrder - b.sortOrder || a.fullName.localeCompare(b.fullName, "fr"),
  );
  return {
    meId: input.me.id,
    members,
    departments: [...new Set(members.map((m) => m.department).filter((d): d is string => Boolean(d)))].sort(),
  };
}
