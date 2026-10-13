import { addDays, eachDay, endOfMonth, startOfMonth } from "./dates";
import type { DateRange, Entry, IsoDate, Member, MonthKey } from "./types";

export type RankingRow = {
  member: Member;
  total: number;
  /** Au moins une saisie sur la période (même à 0). */
  hasEntry: boolean;
  /** Rang partagé en cas d'égalité (1, 2, 2, 4…). */
  rank: number;
  previousTotal: number;
  delta: number;
};

const inRange = (date: IsoDate, { from, to }: DateRange) => date >= from && date <= to;

/** Somme des prospections par membre sur une plage donnée. */
export function totalsByMember(entries: readonly Entry[], range: DateRange): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    if (!inRange(entry.date, range)) continue;
    totals.set(entry.memberId, (totals.get(entry.memberId) ?? 0) + entry.count);
  }
  return totals;
}

export function sumEntries(entries: readonly Entry[], range: DateRange): number {
  let total = 0;
  for (const entry of entries) if (inRange(entry.date, range)) total += entry.count;
  return total;
}

/** Ordre stable : total décroissant, puis ordre d'affichage, puis nom. */
function compareRows(a: { total: number; member: Member }, b: { total: number; member: Member }) {
  return (
    b.total - a.total ||
    a.member.sortOrder - b.member.sortOrder ||
    a.member.fullName.localeCompare(b.member.fullName, "fr")
  );
}

/** Classement des prospecteurs sur une période, comparé à la période précédente. */
export function buildRanking(
  members: readonly Member[],
  entries: readonly Entry[],
  current: DateRange,
  previous: DateRange,
): RankingRow[] {
  const currentTotals = totalsByMember(entries, current);
  const previousTotals = totalsByMember(entries, previous);

  const sorted = members
    .filter((member) => member.isProspector)
    .map((member) => ({
      member,
      total: currentTotals.get(member.id) ?? 0,
      hasEntry: currentTotals.has(member.id),
      previousTotal: previousTotals.get(member.id) ?? 0,
    }))
    .sort(compareRows);

  return sorted.map((row) => ({
    ...row,
    rank: sorted.findIndex((other) => other.total === row.total) + 1,
    delta: row.total - row.previousTotal,
  }));
}

/**
 * Nombre de jours consécutifs avec au moins une prospection, en remontant
 * depuis aujourd'hui. Une journée du jour pas encore saisie ne casse pas la série.
 */
export function currentStreak(entries: readonly Entry[], memberId: string, today: IsoDate): number {
  const activeDays = new Set(
    entries.filter((e) => e.memberId === memberId && e.count > 0).map((e) => e.date),
  );
  let day = activeDays.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (activeDays.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

export type MemberMonthStats = {
  member: Member;
  rank: number;
  total: number;
  activeDays: number;
  averagePerActiveDay: number;
  bestDay: { date: IsoDate; count: number } | null;
  /** Part du total de l'équipe, entre 0 et 1. */
  share: number;
  /** Prospections par jour du mois, dans l'ordre des jours. */
  daily: number[];
};

export type MonthReport = {
  month: MonthKey;
  days: IsoDate[];
  teamTotal: number;
  teamDaily: number[];
  activeMembers: number;
  bestTeamDay: { date: IsoDate; count: number } | null;
  rows: MemberMonthStats[];
};

/** Bilan mensuel complet par personne et pour l'équipe. */
export function buildMonthReport(
  members: readonly Member[],
  entries: readonly Entry[],
  month: MonthKey,
): MonthReport {
  const days = eachDay({ from: startOfMonth(month), to: endOfMonth(month) });
  const dayIndex = new Map(days.map((day, index) => [day, index]));
  const prospectors = members.filter((member) => member.isProspector);
  const dailyByMember = new Map(prospectors.map((m) => [m.id, new Array<number>(days.length).fill(0)]));

  for (const entry of entries) {
    const index = dayIndex.get(entry.date);
    const daily = dailyByMember.get(entry.memberId);
    if (index === undefined || !daily) continue;
    daily[index] += entry.count;
  }

  const teamDaily = days.map((_, index) =>
    prospectors.reduce((sum, member) => sum + (dailyByMember.get(member.id)?.[index] ?? 0), 0),
  );
  const teamTotal = teamDaily.reduce((sum, value) => sum + value, 0);

  const unranked = prospectors.map((member) => {
    const daily = dailyByMember.get(member.id) ?? [];
    const total = daily.reduce((sum, value) => sum + value, 0);
    const activeDays = daily.filter((value) => value > 0).length;
    const bestIndex = daily.reduce((best, value, index) => (value > daily[best] ? index : best), 0);
    return {
      member,
      total,
      activeDays,
      averagePerActiveDay: activeDays === 0 ? 0 : total / activeDays,
      bestDay: total === 0 ? null : { date: days[bestIndex], count: daily[bestIndex] },
      share: teamTotal === 0 ? 0 : total / teamTotal,
      daily,
    };
  });

  const sorted = [...unranked].sort(compareRows);
  const rows = sorted.map((row) => ({
    ...row,
    rank: sorted.findIndex((other) => other.total === row.total) + 1,
  }));

  const bestTeamIndex = teamDaily.reduce(
    (best, value, index) => (value > teamDaily[best] ? index : best),
    0,
  );

  return {
    month,
    days,
    teamTotal,
    teamDaily,
    activeMembers: rows.filter((row) => row.total > 0).length,
    bestTeamDay: teamTotal === 0 ? null : { date: days[bestTeamIndex], count: teamDaily[bestTeamIndex] },
    rows,
  };
}

/** Vrai si rattacher `memberId` à `managerId` créerait une boucle dans l'organigramme. */
export function wouldCreateCycle(
  members: readonly Pick<Member, "id" | "managerId">[],
  memberId: string,
  managerId: string | null,
): boolean {
  if (managerId === null) return false;
  if (managerId === memberId) return true;
  const managerOf = new Map(members.map((m) => [m.id, m.managerId]));
  const seen = new Set<string>();
  let cursor: string | null | undefined = managerId;
  while (cursor) {
    if (cursor === memberId) return true;
    if (seen.has(cursor)) return true;
    seen.add(cursor);
    cursor = managerOf.get(cursor);
  }
  return false;
}

export type OrgNode = { member: Member; reports: OrgNode[] };

/** Construit l'arbre hiérarchique ; les membres orphelins deviennent des racines. */
export function buildOrgTree(members: readonly Member[]): OrgNode[] {
  const ids = new Set(members.map((m) => m.id));
  const byManager = new Map<string | null, Member[]>();
  for (const member of members) {
    const key = member.managerId && ids.has(member.managerId) ? member.managerId : null;
    byManager.set(key, [...(byManager.get(key) ?? []), member]);
  }
  const order = (a: Member, b: Member) =>
    a.sortOrder - b.sortOrder || a.fullName.localeCompare(b.fullName, "fr");

  const visited = new Set<string>();
  const build = (member: Member): OrgNode => {
    visited.add(member.id);
    const reports = (byManager.get(member.id) ?? [])
      .filter((report) => !visited.has(report.id))
      .sort(order)
      .map(build);
    return { member, reports };
  };
  return (byManager.get(null) ?? []).sort(order).map(build);
}

/** Initiales pour les avatars (« Léa Fontaine » → « LF »). */
export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}
