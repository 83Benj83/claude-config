import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { requireMember } from "./auth/session";
import { getRepository } from "./data";
import { addDays, eachDay, endOfMonth, monthKeyOf, periodWindow, startOfMonth, startOfWeek, todayIso } from "./dates";
import { EDITABLE_PAST_DAYS } from "./rules";
import { buildMonthReport, buildRanking, currentStreak, sumEntries, totalsByMember } from "./stats";
import type { IsoDate, MonthKey, Period } from "./types";

/** Date du jour à Paris, lue à la requête (jamais pendant le pré-rendu). */
export async function getToday(): Promise<IsoDate> {
  await connection();
  return todayIso();
}

/** Historique chargé pour calculer les séries en cours. */
const STREAK_LOOKBACK_DAYS = 60;

export async function getRankingData(period: Period) {
  const me = await requireMember();
  const today = await getToday();
  const window = periodWindow(period, today);
  const from = [window.previous.from, addDays(today, -STREAK_LOOKBACK_DAYS)].sort()[0];

  const repository = await getRepository();
  const [members, entries] = await Promise.all([
    repository.listMembers(),
    repository.listEntries({ from, to: today }),
  ]);

  const ranking = buildRanking(members, entries, window.current, window.previous);
  const editableDays = eachDay({ from: addDays(today, -EDITABLE_PAST_DAYS), to: today }).reverse();
  const myEntries: Record<IsoDate, number> = {};
  for (const entry of entries) {
    if (entry.memberId === me.id && entry.date >= editableDays[editableDays.length - 1]) {
      myEntries[entry.date] = entry.count;
    }
  }

  return {
    me,
    today,
    window,
    ranking,
    myRow: ranking.find((row) => row.member.id === me.id) ?? null,
    myStreak: currentStreak(entries, me.id, today),
    myWeekTotal: totalsByMember(entries, { from: startOfWeek(today), to: today }).get(me.id) ?? 0,
    teamTotal: sumEntries(entries, window.current),
    previousTeamTotal: sumEntries(entries, window.previous),
    editableDays,
    myEntries,
  };
}

/** Jours affichés dans la courbe d'activité de l'accueil. */
const HOME_TREND_DAYS = 14;

export const getHomeData = cache(async () => {
  const me = await requireMember();
  const today = await getToday();
  const monthStart = startOfMonth(monthKeyOf(today));
  const trendStart = addDays(today, -(HOME_TREND_DAYS - 1));
  const from = [monthStart, trendStart, startOfWeek(today)].sort()[0];

  const repository = await getRepository();
  const [members, entries] = await Promise.all([
    repository.listMembers(),
    repository.listEntries({ from, to: today }),
  ]);

  const todayRanking = buildRanking(
    members,
    entries,
    { from: today, to: today },
    { from: addDays(today, -1), to: addDays(today, -1) },
  );
  const trendDays = eachDay({ from: trendStart, to: today });
  const dailyTotals = new Map<IsoDate, number>();
  for (const entry of entries) dailyTotals.set(entry.date, (dailyTotals.get(entry.date) ?? 0) + entry.count);

  return {
    me,
    today,
    members,
    podium: todayRanking.filter((row) => row.total > 0).slice(0, 3),
    enteredToday: todayRanking.filter((row) => row.total > 0).length,
    prospectorCount: todayRanking.length,
    totals: {
      today: sumEntries(entries, { from: today, to: today }),
      week: sumEntries(entries, { from: startOfWeek(today), to: today }),
      month: sumEntries(entries, { from: monthStart, to: today }),
    },
    trend: trendDays.map((date) => ({ date, total: dailyTotals.get(date) ?? 0 })),
  };
});

export async function getMonthData(month: MonthKey) {
  const me = await requireMember();
  const today = await getToday();
  const repository = await getRepository();
  const [members, entries] = await Promise.all([
    repository.listMembers(),
    repository.listEntries({ from: startOfMonth(month), to: endOfMonth(month) }),
  ]);
  return { me, today, report: buildMonthReport(members, entries, month) };
}

export async function getTeamData() {
  const me = await requireMember();
  const today = await getToday();
  const repository = await getRepository();
  const [members, entries] = await Promise.all([
    repository.listMembers(),
    repository.listEntries({ from: startOfMonth(monthKeyOf(today)), to: today }),
  ]);
  return { me, members, monthTotals: totalsByMember(entries, { from: startOfMonth(monthKeyOf(today)), to: today }) };
}

export async function getAdminData() {
  const repository = await getRepository();
  return { members: await repository.listMembers() };
}
