import type { DateRange, IsoDate, MonthKey, Period } from "./types";

/** Toutes les journées sont calculées à l'heure de Paris, quel que soit le serveur. */
export const APP_TIME_ZONE = "Europe/Paris";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_KEY_RE = /^(19[7-9]\d|2\d{3})-(0[1-9]|1[0-2])$/;

const isoFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Date du jour à Paris, au format `YYYY-MM-DD`. */
export function todayIso(now: Date = new Date()): IsoDate {
  return isoFormatter.format(now);
}

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) return false;
  const parsed = toUtcDate(value);
  return !Number.isNaN(parsed.getTime()) && fromUtcDate(parsed) === value;
}

export function isMonthKey(value: unknown): value is MonthKey {
  return typeof value === "string" && MONTH_KEY_RE.test(value);
}

function toUtcDate(iso: IsoDate): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function fromUtcDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const date = toUtcDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtcDate(date);
}

/** Nombre de jours entre deux dates (b - a). */
export function diffDays(a: IsoDate, b: IsoDate): number {
  return Math.round((toUtcDate(b).getTime() - toUtcDate(a).getTime()) / 86_400_000);
}

/** Lundi de la semaine (ISO) contenant la date. */
export function startOfWeek(iso: IsoDate): IsoDate {
  const weekday = (toUtcDate(iso).getUTCDay() + 6) % 7; // lundi = 0
  return addDays(iso, -weekday);
}

export function monthKeyOf(iso: IsoDate): MonthKey {
  return iso.slice(0, 7);
}

export function startOfMonth(month: MonthKey): IsoDate {
  return `${month}-01`;
}

export function daysInMonth(month: MonthKey): number {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
}

export function endOfMonth(month: MonthKey): IsoDate {
  return `${month}-${String(daysInMonth(month)).padStart(2, "0")}`;
}

export function addMonths(month: MonthKey, delta: number): MonthKey {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, m - 1 + delta, 1));
  return fromUtcDate(date).slice(0, 7);
}

/** Liste inclusive des dates entre `from` et `to`. */
export function eachDay({ from, to }: DateRange): IsoDate[] {
  const days: IsoDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}

export function isWeekend(iso: IsoDate): boolean {
  const day = toUtcDate(iso).getUTCDay();
  return day === 0 || day === 6;
}

export type PeriodWindow = {
  current: DateRange;
  /** Même durée écoulée sur la période précédente, pour une comparaison équitable. */
  previous: DateRange;
};

/**
 * Fenêtre d'une période se terminant aujourd'hui, et la fenêtre équivalente
 * de la période précédente (ex. lundi→mercredi vs lundi→mercredi dernier).
 */
export function periodWindow(period: Period, today: IsoDate): PeriodWindow {
  if (period === "jour") {
    const yesterday = addDays(today, -1);
    return { current: { from: today, to: today }, previous: { from: yesterday, to: yesterday } };
  }
  if (period === "semaine") {
    const from = startOfWeek(today);
    const elapsed = diffDays(from, today);
    const prevFrom = addDays(from, -7);
    return {
      current: { from, to: today },
      previous: { from: prevFrom, to: addDays(prevFrom, elapsed) },
    };
  }
  const month = monthKeyOf(today);
  const prevMonth = addMonths(month, -1);
  const dayOfMonth = Number(today.slice(8, 10));
  const prevDay = Math.min(dayOfMonth, daysInMonth(prevMonth));
  return {
    current: { from: startOfMonth(month), to: today },
    previous: {
      from: startOfMonth(prevMonth),
      to: `${prevMonth}-${String(prevDay).padStart(2, "0")}`,
    },
  };
}

const dayLabelFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

const shortDayFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const monthLabelFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** « mardi 13 octobre » */
export function formatDayLong(iso: IsoDate): string {
  return dayLabelFormatter.format(toUtcDate(iso));
}

/** « mar. 13 oct. » */
export function formatDayShort(iso: IsoDate): string {
  return shortDayFormatter.format(toUtcDate(iso));
}

/** « octobre 2026 » */
export function formatMonth(month: MonthKey): string {
  return monthLabelFormatter.format(toUtcDate(startOfMonth(month)));
}

/** Libellé relatif court : « Aujourd'hui », « Hier » ou la date courte. */
export function formatRelativeDay(iso: IsoDate, today: IsoDate): string {
  const delta = diffDays(iso, today);
  if (delta === 0) return "Aujourd'hui";
  if (delta === 1) return "Hier";
  return formatDayShort(iso);
}
