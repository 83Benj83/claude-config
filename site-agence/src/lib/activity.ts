/**
 * Activité du site, pour les admins : qui est venu aujourd'hui et cette
 * semaine, les connexions (réussies ou refusées) et les chiffres utiles.
 * Calculs purs, communs au site et à l'aperçu.
 */
import { loginKey } from "./data/repository";
import { addDays, eachDay, todayIso } from "./dates";
import { ACTIVITY_DAYS, LOGIN_EVENTS_SHOWN, PRESENCE_REFRESH_MS, STORAGE_QUOTA_BYTES } from "./rules";
import type { Contract, IsoDate, LoginEvent, Member, Message, PresenceDay, Prospect } from "./types";
import { summarize, type MemberSummary } from "./views";

/** Faut-il noter la visite ? Première visite, plus de 5 minutes depuis la dernière, ou nouveau jour à Paris. */
export function isPresenceDue(lastSeenAt: string | null, now: Date): boolean {
  if (!lastSeenAt) return true;
  const last = new Date(lastSeenAt);
  return now.getTime() - last.getTime() >= PRESENCE_REFRESH_MS || todayIso(last) !== todayIso(now);
}

/** Jour (Paris) d'un instant ISO. */
const dayOf = (iso: string): IsoDate => todayIso(new Date(iso));

const latest = (...values: (string | null)[]) =>
  values.filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;

export type ActivityRow = {
  member: MemberSummary;
  /** Première et dernière visite aujourd'hui, `null` si pas encore venu. */
  today: { firstSeenAt: string; lastSeenAt: string } | null;
  /** Dernière visite connue (ou, à défaut, dernière connexion). */
  lastSeenAt: string | null;
  /** Jamais connecté (identifiant pas encore utilisé). */
  neverSeen: boolean;
  /** Présence sur chacun des 7 derniers jours (du plus ancien à aujourd'hui). */
  days: boolean[];
  prospectsToday: number;
  prospectsWeek: number;
  messagesToday: number;
  messagesWeek: number;
};

export type ActivityLogin = {
  id: string;
  at: string;
  ok: boolean;
  /** Nom de la personne (retrouvé d'après l'identifiant saisi), `null` si inconnu. */
  name: string | null;
  login: string;
};

export type ActivityView = {
  today: IsoDate;
  days: IsoDate[];
  totals: { members: number; presentToday: number; prospectsToday: number; messagesToday: number; refusedToday: number };
  rows: ActivityRow[];
  logins: ActivityLogin[];
  site: {
    admins: string[];
    neverConnected: string[];
    inactive: number;
    establishments: number;
    contractsInProgress: number;
    contractsDone: number;
    files: number;
    bytes: number;
    quotaBytes: number;
    statsSince: string | null;
  };
};

export type ActivityInput = {
  members: Member[];
  presence: PresenceDay[];
  logins: LoginEvent[];
  /** Prospects saisis récemment (comptés d'après leur date d'ajout). */
  prospects: Prospect[];
  messages: Message[];
  contracts: Contract[];
  storage: { files: number; bytes: number };
  establishments: number;
  statsSince: string | null;
  today: IsoDate;
};

/** Nombre d'éléments par membre, aujourd'hui et sur les 7 derniers jours. */
function countByMember<T>(items: T[], memberOf: (item: T) => string, dayOf: (item: T) => IsoDate, today: IsoDate, weekStart: IsoDate) {
  const counts = new Map<string, { today: number; week: number }>();
  for (const item of items) {
    const day = dayOf(item);
    if (day < weekStart || day > today) continue;
    const count = counts.get(memberOf(item)) ?? { today: 0, week: 0 };
    count.week += 1;
    if (day === today) count.today += 1;
    counts.set(memberOf(item), count);
  }
  return (memberId: string) => counts.get(memberId) ?? { today: 0, week: 0 };
}

function buildRows(input: ActivityInput, days: IsoDate[]): ActivityRow[] {
  const { today } = input;
  const presence = new Map(input.presence.map((entry) => [`${entry.memberId}|${entry.day}`, entry]));
  const prospects = countByMember(input.prospects, (p) => p.memberId, (p) => dayOf(p.createdAt), today, days[0]);
  const messages = countByMember(input.messages, (m) => m.authorId, (m) => dayOf(m.createdAt), today, days[0]);

  const rows = input.members
    .filter((member) => member.active)
    .map((member): ActivityRow => {
      const seenToday = presence.get(`${member.id}|${today}`);
      const lastSeenAt = latest(member.lastSeenAt, member.lastLoginAt, seenToday?.lastSeenAt ?? null);
      return {
        member: summarize(member),
        today: seenToday ? { firstSeenAt: seenToday.firstSeenAt, lastSeenAt: seenToday.lastSeenAt } : null,
        lastSeenAt,
        neverSeen: !member.welcomedAt && !lastSeenAt,
        days: days.map((day) => presence.has(`${member.id}|${day}`)),
        prospectsToday: prospects(member.id).today,
        prospectsWeek: prospects(member.id).week,
        messagesToday: messages(member.id).today,
        messagesWeek: messages(member.id).week,
      };
    });

  // Venus aujourd'hui (les premiers arrivés d'abord), puis les autres par dernière visite, enfin ceux jamais venus.
  return rows.sort((a, b) => {
    if (a.today && b.today) return a.today.firstSeenAt.localeCompare(b.today.firstSeenAt);
    if (a.today || b.today) return a.today ? -1 : 1;
    if (a.lastSeenAt !== b.lastSeenAt) return a.lastSeenAt === null ? 1 : b.lastSeenAt === null ? -1 : b.lastSeenAt.localeCompare(a.lastSeenAt);
    return a.member.fullName.localeCompare(b.member.fullName, "fr");
  });
}

export function buildActivityView(input: ActivityInput): ActivityView {
  const { today } = input;
  const days = eachDay({ from: addDays(today, -(ACTIVITY_DAYS - 1)), to: today });
  const rows = buildRows(input, days);
  const active = input.members.filter((member) => member.active);
  const byId = new Map(input.members.map((member) => [member.id, member]));
  const byLogin = new Map(input.members.map((member) => [loginKey(member.login), member]));

  const logins = [...input.logins]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, LOGIN_EVENTS_SHOWN)
    .map((event): ActivityLogin => {
      const member = (event.memberId && byId.get(event.memberId)) || byLogin.get(loginKey(event.login));
      return { id: event.id, at: event.at, ok: event.ok, name: member ? member.fullName : null, login: event.login };
    });

  return {
    today,
    days,
    totals: {
      members: active.length,
      presentToday: rows.filter((row) => row.today).length,
      prospectsToday: rows.reduce((sum, row) => sum + row.prospectsToday, 0),
      messagesToday: rows.reduce((sum, row) => sum + row.messagesToday, 0),
      refusedToday: input.logins.filter((event) => !event.ok && dayOf(event.at) === today).length,
    },
    rows,
    logins,
    site: {
      admins: active.filter((member) => member.isAdmin).map((member) => member.fullName),
      neverConnected: active.filter((member) => !member.welcomedAt).map((member) => member.fullName),
      inactive: input.members.length - active.length,
      establishments: input.establishments,
      contractsInProgress: input.contracts.filter((contract) => contract.status !== "termine").length,
      contractsDone: input.contracts.filter((contract) => contract.status === "termine").length,
      files: input.storage.files,
      bytes: input.storage.bytes,
      quotaBytes: STORAGE_QUOTA_BYTES,
      statsSince: input.statsSince,
    },
  };
}
