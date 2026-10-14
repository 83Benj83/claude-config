/**
 * Liste « À contacter » : des commerces sans site web, trouvés pour l'équipe.
 * Chacun en choisit un, le contacte, puis le coche : il quitte la liste pour
 * tout le monde et devient un prospect de la personne. Fonctions pures,
 * communes au site, à l'aperçu et au script d'ajout des listes.
 */
import { todayIso } from "./dates";
import { groupEstablishments, normalizeText } from "./establishments";
import { establishmentKey } from "./prospect-import";
import type { Channel, IsoDate, Lead, Member, Prospect } from "./types";

/** Ce qu'une ligne d'une nouvelle liste apporte (le reste est fixé à l'enregistrement). */
export type NewLead = Pick<Lead, "name" | "city" | "category" | "phone" | "email" | "instagram" | "facebook" | "note" | "listDay">;

/** Adresses Instagram et Facebook : https seulement, sur le bon site, 160 caractères au plus. */
const MAX_URL = 160;

function safeUrl(value: string, hosts: RegExp): string | null {
  if (value.length > MAX_URL) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && hosts.test(url.hostname) ? value : null;
  } catch {
    return null;
  }
}

/** « @compte » ou adresse de la page Instagram. */
export function instagramUrl(value: string | null): string | null {
  if (!value) return null;
  const handle = value.match(/^@?([A-Za-z0-9._]{1,30})$/)?.[1];
  if (handle) return `https://www.instagram.com/${handle}/`;
  return safeUrl(value, /^(?:[a-z0-9-]+\.)?instagram\.com$/i);
}

export function facebookUrl(value: string | null): string | null {
  return value ? safeUrl(value, /^(?:(?:[a-z0-9-]+\.)?facebook\.com|fb\.com)$/i) : null;
}

const line = (value: unknown, max: number): string | null => {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
};

const phoneOf = (value: string | null) => (value && /^\+?[\d .()-]{8,30}$/.test(value) && value.replace(/\D/g, "").length >= 9 ? value : null);
const emailOf = (value: string | null) => (value && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value) ? value : null);

/** Noms de colonnes acceptés (français ou anglais, sans accents). */
const FIELDS: Record<keyof Omit<NewLead, "listDay">, string[]> = {
  name: ["nom", "name", "enseigne", "commerce"],
  city: ["ville", "city"],
  category: ["categorie", "category", "type", "activite"],
  phone: ["telephone", "tel", "phone", "numero"],
  email: ["email", "e mail", "mail"],
  instagram: ["instagram", "insta"],
  facebook: ["facebook", "fb"],
  note: ["note", "notes", "infos", "commentaire"],
};

/** Une ligne d'une liste (objet JSON) : nom et ville obligatoires, coordonnées vérifiées. */
export function parseLead(input: unknown, listDay: IsoDate): { ok: true; lead: NewLead } | { ok: false; message: string } {
  const data = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const byKey = new Map(Object.entries(data).map(([key, value]) => [normalizeText(key), value]));
  const field = (name: keyof typeof FIELDS) => FIELDS[name].map((key) => byKey.get(key)).find((value) => value !== undefined);

  const name = line(field("name"), 200);
  const city = line(field("city"), 200);
  if (!name) return { ok: false, message: "Le nom manque." };
  if (!city) return { ok: false, message: "La ville manque." };
  if (name.length > 120) return { ok: false, message: "Nom trop long (120 caractères au plus)." };
  if (city.length > 80) return { ok: false, message: "Ville trop longue (80 caractères au plus)." };
  return {
    ok: true,
    lead: {
      name,
      city,
      category: line(field("category"), 60),
      phone: phoneOf(line(field("phone"), 30)),
      email: emailOf(line(field("email"), 160)),
      instagram: instagramUrl(line(field("instagram"), 200)),
      facebook: facebookUrl(line(field("facebook"), 200)),
      note: line(field("note"), 300),
      listDay,
    },
  };
}

/** Moyens de contact connus du commerce, toujours dans le même ordre. */
export function leadContacts(lead: Lead): { channel: Channel; value: string }[] {
  const all: [Channel, string | null][] = [
    ["telephone", lead.phone],
    ["email", lead.email],
    ["instagram", lead.instagram],
    ["facebook", lead.facebook],
  ];
  return all.filter((entry): entry is [Channel, string] => Boolean(entry[1])).map(([channel, value]) => ({ channel, value }));
}

/** Coordonnée gardée dans le prospect selon le moyen utilisé. */
export function contactFor(lead: Lead, channel: Channel): string | null {
  return leadContacts(lead).find((contact) => contact.channel === channel)?.value ?? null;
}

export type LeadRow = {
  lead: Lead;
  contacts: { channel: Channel; value: string }[];
  /** Dernière prise de contact de l'équipe avec ce commerce, s'il y en a une. */
  known: { name: string; date: IsoDate; channel: Channel } | null;
};

export type DoneLeadRow = { lead: Lead; doneByName: string; canUndo: boolean };

export type LeadsView = {
  today: IsoDate;
  /** Les admins peuvent retirer un commerce de la liste. */
  canManage: boolean;
  /** Jour de la liste la plus récente. */
  listDay: IsoDate | null;
  cities: { city: string; count: number }[];
  open: LeadRow[];
  doneToday: DoneLeadRow[];
};

export function buildLeadsView(input: { leads: Lead[]; members: Member[]; contacted: Prospect[]; me: Member; today: IsoDate }): LeadsView {
  const { me, today } = input;
  const names = new Map(input.members.map((member) => [member.id, member.fullName]));
  const known = new Map(groupEstablishments(input.contacted, input.members).map((establishment) => [establishment.key, establishment]));

  const open = input.leads
    .filter((lead) => lead.status === "open")
    .sort((a, b) => a.city.localeCompare(b.city, "fr") || a.name.localeCompare(b.name, "fr"))
    .map((lead): LeadRow => {
      const last = known.get(establishmentKey(lead.name, lead.city))?.contacts[0];
      return { lead, contacts: leadContacts(lead), known: last ? { name: last.memberName, date: last.date, channel: last.channel } : null };
    });

  const cities = new Map<string, { city: string; count: number }>();
  for (const { lead } of open) {
    const key = normalizeText(lead.city);
    cities.set(key, { city: cities.get(key)?.city ?? lead.city, count: (cities.get(key)?.count ?? 0) + 1 });
  }

  const doneToday = input.leads
    .filter((lead) => lead.status === "done" && lead.doneAt && todayIso(new Date(lead.doneAt)) === today)
    .sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""))
    .map((lead) => ({
      lead,
      doneByName: (lead.doneBy && names.get(lead.doneBy)) || "Ancien membre",
      canUndo: lead.doneBy === me.id || me.isAdmin,
    }));

  return {
    today,
    canManage: me.isAdmin,
    listDay: open.map(({ lead }) => lead.listDay).sort().at(-1) ?? null,
    cities: [...cities.values()],
    open,
    doneToday,
  };
}
