import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { arrondissement, parseLead } from "@/lib/leads";
import { leadsSeedSql } from "@/lib/leads-seed";

/**
 * Listes « À contacter » chargées par migration : chaque ligne doit passer la
 * lecture habituelle, avoir un vrai numéro, et la migration doit correspondre
 * exactement au fichier de données (régénérée par `npm run leads:seed-sql`).
 */
const LISTS = [
  {
    file: "data/leads-paris-2026-10.json",
    migration: "supabase/migrations/0010_leads_paris.sql",
    title: "Liste « À contacter » : 100 commerces à Paris sans site web (octobre 2026)",
    count: 100,
    paris: true,
  },
  {
    file: "data/leads-var-2026-10.json",
    migration: "supabase/migrations/0011_leads_var.sql",
    title: "Liste « À contacter » : 10 commerces du Var sans site web (octobre 2026)",
    count: 10,
    paris: false,
  },
];

const FRENCH_PHONE = /^0[1-9](?: \d{2}){4}$/;
const key = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

describe.each(LISTS)("$file", ({ file, migration, title, count, paris }) => {
  const rows = JSON.parse(readFileSync(file, "utf8")) as unknown[];
  const parsed = rows.map((row) => parseLead(row, "2026-10-17"));
  const leads = parsed.flatMap((result) => (result.ok ? [result.lead] : []));

  test("chaque ligne est acceptée, avec un numéro français valide", () => {
    expect(rows).toHaveLength(count);
    expect(parsed.filter((result) => !result.ok)).toEqual([]);
    for (const lead of leads) expect(lead.phone, lead.name).toMatch(FRENCH_PHONE);
  });

  test("ni nom ni numéro en double", () => {
    expect(new Set(leads.map((lead) => key(lead.name))).size).toBe(count);
    expect(new Set(leads.map((lead) => lead.phone)).size).toBe(count);
  });

  test.runIf(paris)("à Paris : adresse avec arrondissement, secteur et 3 infos pour l'appel", () => {
    for (const lead of leads) {
      expect(lead.city, lead.name).toBe("Paris");
      expect(arrondissement(lead.address), lead.name).not.toBeNull();
      expect(lead.category, lead.name).toBeTruthy();
      expect(lead.tips, lead.name).toHaveLength(3);
    }
    // Sources gardées dans le fichier pour vérifier chaque numéro.
    for (const row of rows as { sources?: string[] }[]) expect(row.sources?.length).toBeGreaterThan(0);
  });

  test("la migration correspond exactement au fichier", () => {
    const seed = leads.map(({ listDay: _day, ...lead }) => lead);
    expect(readFileSync(migration, "utf8")).toBe(leadsSeedSql(seed, title));
  });
});
