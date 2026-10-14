const integer = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });

/** 1284 → « 1 284 » */
export const formatInt = (value: number) => integer.format(value);

/** 12.345 → « 12,3 » */
export const formatDecimal = (value: number) => decimal.format(value);

/** 0.237 → « 24 % » */
export const formatPercent = (value: number) => percent.format(value);

/** Variation signée : « +12 », « -3 », « 0 ». */
export const formatDelta = (value: number) => (value > 0 ? `+${formatInt(value)}` : formatInt(value));

/** « 1er », « 2e », « 3e » */
export const formatRank = (rank: number) => (rank === 1 ? "1er" : `${rank}e`);

const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/** 1090 → « 1 090 € » */
export const formatEuros = (value: number) => euros.format(value);

export const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] ?? fullName;

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${formatInt(count)} ${count > 1 ? plural : singular}`;
}
