/**
 * Migration SQL qui ajoute des contacts déjà faits aux prospects d'un membre
 * (classement, « Déjà contacté ? »), sans passer par le formulaire. Le membre
 * est retrouvé par son identifiant, sinon par son prénom (premier mot du nom)
 * s'il est seul à le porter ; sinon ses lignes sont ignorées.
 * Rejouable : un contact déjà présent pour ce membre (même commerce, même ville)
 * n'est jamais ajouté deux fois.
 */
import { cityKey, nameKey, normalizeText } from "./establishments";
import { isChannel } from "./channels";
import { isIsoDate } from "./dates";
import type { Channel, IsoDate } from "./types";
import { prospectSchema } from "./validation";

export type SeedProspect = {
  /** Prénom ou identifiant du membre, en minuscules sans accents. */
  member: string;
  name: string;
  city: string;
  channel: Channel;
  contact: string | null;
  note: string | null;
  date: IsoDate;
};

/** Une ligne du fichier (`membre`, `nom`, `ville`, `moyen`, `contact`, `note`, `date`), vérifiée comme dans le formulaire. */
export function parseSeedProspect(input: unknown): { ok: true; prospect: SeedProspect } | { ok: false; message: string } {
  const row = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const member = normalizeText(String(row.membre ?? "")).replace(/\s+/g, "");
  if (!member) return { ok: false, message: "Le membre manque." };
  if (!isChannel(row.moyen)) return { ok: false, message: "Moyen de contact inconnu." };
  if (!isIsoDate(row.date)) return { ok: false, message: "Date invalide." };
  const parsed = prospectSchema.safeParse({ name: row.nom, city: row.ville, channel: row.moyen, contact: row.contact ?? "", note: row.note ?? "", date: row.date });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Ligne invalide." };
  const { name, city, channel, contact, note, date } = parsed.data;
  return { ok: true, prospect: { member, name, city, channel, contact: contact || null, note: note || null, date } };
}

const text = (value: string | null) => (value === null ? "null" : `'${value.replace(/'/g, "''")}'`);

/** Un seul contact par membre et par commerce dans le fichier (le premier gardé). */
export function uniqueProspects(prospects: SeedProspect[]): SeedProspect[] {
  const seen = new Set<string>();
  return prospects.filter((prospect) => {
    const key = `${prospect.member}|${nameKey(prospect.name)}|${cityKey(prospect.city)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function prospectsSeedSql(prospects: SeedProspect[], title: string): string {
  const rows = uniqueProspects(prospects).map((p) =>
    `  (${[p.member, p.name, nameKey(p.name), p.city, cityKey(p.city), p.channel, p.contact, p.note, p.date].map(text).join(", ")})`,
  );
  return [
    "-- =====================================================================",
    `-- ${title}`,
    "-- Généré par `npm run prospects:seed-sql` à partir du fichier de données : ne pas modifier à la main.",
    "-- Chaque contact rejoint les prospects du membre (prénom ou identifiant) ; un membre",
    "-- introuvable ou ambigu est ignoré ; un contact déjà présent pour ce membre aussi.",
    "-- =====================================================================",
    "",
    "with v (member, name, name_key, city, city_key, channel, contact, note, contacted_on) as (",
    "  values",
    rows.join(",\n"),
    "),",
    "-- Le membre : son identifiant d'abord, sinon son prénom s'il est seul à le porter.",
    "who as (",
    "  select v2.member, coalesce(",
    "    (select m.id from public.members m where m.login_key = v2.member),",
    "    (select min(m.id::text)::uuid from public.members m",
    "      where lower(split_part(btrim(m.full_name), ' ', 1)) = v2.member having count(*) = 1)",
    "  ) as id",
    "  from (select distinct member from v) v2",
    ")",
    "insert into public.prospects (member_id, name, name_key, city, city_key, channel, contact, note, contacted_on)",
    "select who.id, v.name, v.name_key, v.city, v.city_key, v.channel, v.contact, v.note, v.contacted_on::date",
    "from v",
    "join who on who.member = v.member and who.id is not null",
    "where not exists (",
    "  select 1 from public.prospects p",
    "  where p.member_id = who.id and p.name_key = v.name_key and p.city_key = v.city_key",
    ");",
    "",
  ].join("\n");
}
