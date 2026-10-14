/**
 * Import d'une liste de prospects (fichier Excel, CSV ou texte) : lecture du
 * tableau, reconnaissance des colonnes, puis vérification de chaque ligne
 * avec les mêmes règles que la saisie manuelle. Commun au navigateur (aperçu
 * avant l'envoi) et au serveur (vérification finale).
 */
import type { ProspectFormValues } from "./actions-contract";
import { CHANNELS, isChannel } from "./channels";
import { isIsoDate, todayIso } from "./dates";
import { cityKey, nameKey, normalizeText } from "./establishments";
import type { Channel, IsoDate } from "./types";
import { isEditableDate, prospectSchema } from "./validation";
import { EDITABLE_PAST_DAYS } from "./rules";

/** Au plus 500 lignes et 2 Mo par import. */
export const IMPORT_MAX_ROWS = 500;
export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;

export type Cell = string | number | boolean | Date | null | undefined;
export type ImportField = "name" | "city" | "channel" | "contact" | "note" | "date";
export type ImportColumns = Partial<Record<ImportField, number>>;

/** Ordre des colonnes quand le fichier n'a pas de ligne de titres. */
const FIELD_ORDER: ImportField[] = ["name", "city", "channel", "contact", "note", "date"];

/** Titres reconnus, testés dans cet ordre (« date de contact » est une date, pas des coordonnées). */
const HEADER_WORDS: [ImportField, string[]][] = [
  ["date", ["date", "jour", "contacte le", "date du contact", "date de contact"]],
  ["channel", ["moyen de contact", "moyen", "canal", "contacte par", "contact par", "via", "channel"]],
  ["note", ["note", "notes", "commentaire", "commentaires", "remarque", "remarques", "observations", "infos"]],
  ["city", ["ville", "city", "commune", "localite", "lieu"]],
  ["name", ["nom du restaurant", "nom du commerce", "nom", "restaurant", "commerce", "etablissement", "enseigne", "societe", "entreprise", "boutique", "name"]],
  ["contact", ["coordonnees", "contact", "telephone", "tel", "numero", "email", "e mail", "mail", "instagram", "site", "lien"]],
];

const CHANNEL_WORDS: [Channel, string[]][] = [
  ["telephone", ["telephone", "tel", "appel", "phone", "portable", "fixe"]],
  ["email", ["email", "e mail", "mail", "courriel"]],
  ["instagram", ["instagram", "insta", "ig"]],
  ["facebook", ["facebook", "fb", "messenger"]],
  ["linkedin", ["linkedin"]],
  ["visite", ["sur place", "visite", "porte a porte", "passage", "en personne", "physique"]],
  ["formulaire", ["formulaire", "form", "site web", "site internet"]],
  ["autre", ["autre", "other"]],
];

const hasWord = (text: string, word: string) => ` ${text} `.includes(` ${word} `);

function cellText(cell: Cell): string {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) return Number.isNaN(cell.getTime()) ? "" : todayIso(cell);
  return String(cell).replace(/\s+/g, " ").trim();
}

function headerField(cell: Cell): ImportField | null {
  const text = normalizeText(cellText(cell));
  if (!text) return null;
  for (const [field, words] of HEADER_WORDS) if (words.some((word) => text === word)) return field;
  for (const [field, words] of HEADER_WORDS) if (words.some((word) => hasWord(text, word))) return field;
  return null;
}

/** Colonnes d'une ligne de titres, ou `null` si la ligne ressemble à des données. */
export function detectColumns(row: readonly Cell[]): ImportColumns | null {
  const columns: ImportColumns = {};
  row.forEach((cell, index) => {
    const field = headerField(cell);
    if (field && columns[field] === undefined) columns[field] = index;
  });
  const found = Object.keys(columns).length;
  return columns.name !== undefined || columns.city !== undefined || found >= 2 ? columns : null;
}

export function parseChannel(value: string): Channel | null {
  const text = normalizeText(value);
  if (!text) return null;
  if (isChannel(text)) return text;
  const byLabel = CHANNELS.find((channel) => normalizeText(channel.label) === text);
  if (byLabel) return byLabel.value;
  for (const [channel, words] of CHANNEL_WORDS) if (words.some((word) => text === word || hasWord(text, word))) return channel;
  return null;
}

/** Moyen de contact deviné d'après les coordonnées : e-mail, numéro ou compte Instagram. */
export function channelFromContact(contact: string): Channel | null {
  if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(contact)) return "email";
  if (/^\+?[\d .()-]{8,20}$/.test(contact) && contact.replace(/\D/g, "").length >= 9) return "telephone";
  if (/^@[\w.]{2,30}$/.test(contact) || /instagram\.com\//i.test(contact)) return "instagram";
  return null;
}

/** Date française (14/10/2026, 14-10-26, 14.10) ou ISO ; `null` si illisible. */
export function parseDate(cell: Cell, today: IsoDate): IsoDate | null {
  if (cell instanceof Date) return Number.isNaN(cell.getTime()) ? null : todayIso(cell);
  const text = cellText(cell);
  const iso: unknown = text;
  if (isIsoDate(iso)) return iso;
  const match = text.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2}|\d{4}))?$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const fullYear = year ? (year.length === 2 ? `20${year}` : year) : today.slice(0, 4);
  const candidate = `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  return isIsoDate(candidate) ? candidate : null;
}

/** Excel enlève le 0 des numéros (612345678) : on le remet. */
function contactText(cell: Cell): string {
  if (typeof cell === "number" && Number.isInteger(cell) && /^[1-9]\d{8}$/.test(String(cell))) return `0${cell}`;
  return cellText(cell);
}

export type ImportOptions = {
  /** Ville des lignes qui n'en ont pas. */
  defaultCity: string;
  /** Moyen de contact des lignes où il manque et ne se devine pas. */
  defaultChannel: Channel | "";
  /** Toutes les lignes à la date du jour, quelles que soient les dates du fichier. */
  useToday: boolean;
  today: IsoDate;
};

export type ImportTable = { hasHeader: boolean; columns: ImportColumns; rows: { line: number; cells: Cell[] }[] };

/** Lignes de données (vides ignorées) et colonnes reconnues. `line` : numéro de ligne dans le fichier. */
export function readTable(table: readonly (readonly Cell[])[]): ImportTable {
  const lines = table.map((cells, index) => ({ line: index + 1, cells: [...cells] })).filter(({ cells }) => cells.some((cell) => cellText(cell)));
  const first = lines[0];
  const header = first ? detectColumns(first.cells) : null;
  const width = Math.max(0, ...lines.map(({ cells }) => cells.length));
  const columns: ImportColumns = header ?? Object.fromEntries(FIELD_ORDER.slice(0, width).map((field, index) => [field, index]));
  return { hasHeader: header !== null, columns, rows: header ? lines.slice(1) : lines };
}

export function toFormValues({ columns, rows }: ImportTable, options: ImportOptions): ProspectFormValues[] {
  const at = (cells: Cell[], field: ImportField) => (columns[field] === undefined ? undefined : cells[columns[field]]);
  return rows.map(({ cells }) => {
    const contact = contactText(at(cells, "contact"));
    const channel = parseChannel(cellText(at(cells, "channel"))) ?? channelFromContact(contact) ?? options.defaultChannel;
    const date = options.useToday ? options.today : (parseDate(at(cells, "date"), options.today) ?? options.today);
    return {
      name: cellText(at(cells, "name")),
      city: cellText(at(cells, "city")) || options.defaultCity.trim(),
      channel,
      contact,
      note: cellText(at(cells, "note")),
      date,
    };
  });
}

export type RowStatus =
  | { status: "ready" }
  | { status: "known" }
  | { status: "duplicate" }
  | { status: "invalid"; message: string };

/** Clé d'un établissement : même nom (sans articles ni accents) dans la même ville. */
export const establishmentKey = (name: string, city: string) => `${nameKey(name)}|${cityKey(city)}`;

/**
 * Verdict de chaque ligne : prête, déjà contactée par l'équipe, en double dans
 * le fichier, ou à corriger (avec la raison, comme dans le formulaire).
 */
export function analyzeRows(rows: readonly ProspectFormValues[], known: ReadonlySet<string>, today: IsoDate): RowStatus[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const parsed = prospectSchema.safeParse(row);
    if (!parsed.success) return { status: "invalid", message: parsed.error.issues[0]?.message ?? "Ligne invalide." };
    if (!isEditableDate(parsed.data.date, today)) {
      return { status: "invalid", message: `Date hors des ${EDITABLE_PAST_DAYS} derniers jours.` };
    }
    const key = establishmentKey(parsed.data.name, parsed.data.city);
    if (seen.has(key)) return { status: "duplicate" };
    seen.add(key);
    return known.has(key) ? { status: "known" } : { status: "ready" };
  });
}

/** Liste reçue d'un navigateur : seulement des lignes de textes, et pas plus que la limite. */
export function sanitizeRows(input: unknown): ProspectFormValues[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > IMPORT_MAX_ROWS) return null;
  const text = (value: unknown) => (typeof value === "string" ? value.slice(0, 600) : "");
  return input.map((row) => {
    const data = typeof row === "object" && row !== null ? (row as Record<string, unknown>) : {};
    return {
      name: text(data.name),
      city: text(data.city),
      channel: text(data.channel),
      contact: text(data.contact),
      note: text(data.note),
      date: text(data.date),
    };
  });
}
