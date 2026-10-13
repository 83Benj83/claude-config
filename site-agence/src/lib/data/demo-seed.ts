import { addDays, isWeekend } from "../dates";
import type { Entry, IsoDate, Member } from "../types";

/** Équipe fictive du mode démo. Remplacée par les vrais comptes une fois Supabase branché. */
export const DEMO_MEMBERS: readonly Member[] = [
  demo("camille", "Camille Renaud", "Fondatrice & directrice", "Direction", null, { isAdmin: true, isProspector: false }),
  demo("mehdi", "Mehdi Belkacem", "Responsable commercial", "Commercial", "camille", { isAdmin: true, sortOrder: 1 }),
  demo("ines", "Inès Marchetti", "Lead développeuse", "Production", "camille", { isProspector: false, sortOrder: 2 }),
  demo("lea", "Léa Fontaine", "Chargée de prospection", "Commercial", "mehdi", { sortOrder: 3 }),
  demo("yanis", "Yanis Haddad", "Chargé de prospection", "Commercial", "mehdi", { sortOrder: 4 }),
  demo("clara", "Clara Nguyen", "Chargée de prospection", "Commercial", "mehdi", { sortOrder: 5 }),
  demo("theo", "Théo Garnier", "Chargé de prospection", "Commercial", "mehdi", { sortOrder: 6 }),
  demo("amandine", "Amandine Roux", "Business developer", "Commercial", "mehdi", { sortOrder: 7 }),
  demo("karim", "Karim Ouali", "Business developer", "Commercial", "mehdi", { sortOrder: 8 }),
  demo("hugo", "Hugo Lefebvre", "Designer UI/UX", "Production", "ines", { isProspector: false, sortOrder: 9 }),
  demo("nathan", "Nathan Perrin", "Développeur web", "Production", "ines", { isProspector: false, sortOrder: 10 }),
];

function demo(
  id: string,
  fullName: string,
  jobTitle: string,
  department: string,
  managerId: string | null,
  overrides: Partial<Member> = {},
): Member {
  return {
    id,
    fullName,
    jobTitle,
    department,
    managerId,
    avatarUrl: null,
    isProspector: true,
    isAdmin: false,
    sortOrder: 0,
    ...overrides,
  };
}

/** Rythme moyen de prospections par jour ouvré, pour des données réalistes. */
const DAILY_PACE: Record<string, number> = {
  mehdi: 14,
  lea: 31,
  yanis: 27,
  clara: 35,
  theo: 22,
  amandine: 29,
  karim: 18,
};

/** Membres qui ont déjà saisi leur journée en cours, pour animer le classement du jour. */
const ALREADY_ENTERED_TODAY = new Set(["clara", "yanis", "lea", "karim"]);

const HISTORY_DAYS = 120;

/** Générateur pseudo-aléatoire déterministe (mulberry32) : mêmes données à chaque démarrage. */
function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (const char of text) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Historique de prospections des 120 derniers jours, relatif à `today`. */
export function generateDemoEntries(today: IsoDate): Entry[] {
  const entries: Entry[] = [];
  for (const [memberId, pace] of Object.entries(DAILY_PACE)) {
    const random = seededRandom(hash(memberId));
    for (let offset = HISTORY_DAYS; offset >= 0; offset -= 1) {
      const date = addDays(today, -offset);
      const roll = random();
      const isToday = offset === 0;
      if (isToday && !ALREADY_ENTERED_TODAY.has(memberId)) continue;
      if (isWeekend(date)) {
        if (roll < 0.8) continue; // rares sessions le week-end
        entries.push({ memberId, date, count: Math.round(pace * 0.3 * random()) });
        continue;
      }
      if (roll < 0.06) continue; // jour off
      const variation = 0.55 + random() * 0.9;
      const count = Math.max(0, Math.round(pace * variation * (isToday ? 0.6 : 1)));
      entries.push({ memberId, date, count });
    }
  }
  return entries;
}
