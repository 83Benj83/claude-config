/**
 * Migration SQL qui charge une liste « À contacter » dans la base en ligne.
 * Les migrations passent avant chaque mise en ligne : la liste arrive sans
 * rien lancer à la main. Rejouable : un commerce déjà présent (même nom,
 * même ville) n'est jamais ajouté deux fois.
 */
import type { NewLead } from "./leads";

export type SeedLead = Omit<NewLead, "listDay">;

/** Texte SQL entre apostrophes (apostrophes doublées), ou `null`. */
const text = (value: string | null) => (value === null ? "null" : `'${value.replace(/'/g, "''")}'`);
const textArray = (values: string[]) => (values.length > 0 ? `array[${values.map(text).join(", ")}]` : "array[]::text[]");

const COLUMNS = ["name", "city", "category", "phone", "email", "instagram", "facebook", "note", "address", "tips"] as const;

export function leadsSeedSql(leads: SeedLead[], title: string): string {
  const rows = leads.map((lead) => {
    const values = [lead.name, lead.city, lead.category, lead.phone, lead.email, lead.instagram, lead.facebook, lead.note, lead.address].map(text);
    return `  (${[...values, textArray(lead.tips)].join(", ")})`;
  });
  return [
    "-- =====================================================================",
    `-- ${title}`,
    "-- Généré par `npm run leads:seed-sql` à partir du fichier de données : ne pas modifier à la main.",
    "-- Ajoutés une seule fois, au jour de la mise en ligne ; un commerce déjà présent",
    "-- (même nom, même ville) est ignoré.",
    "-- =====================================================================",
    "",
    `insert into public.leads (${COLUMNS.join(", ")}, list_day)`,
    `select ${COLUMNS.map((column) => `v.${column}`).join(", ")}, (now() at time zone 'Europe/Paris')::date`,
    "from (values",
    rows.join(",\n"),
    `) as v (${COLUMNS.join(", ")})`,
    "where not exists (",
    "  select 1 from public.leads l where lower(l.name) = lower(v.name) and lower(l.city) = lower(v.city)",
    ");",
    "",
  ].join("\n");
}
