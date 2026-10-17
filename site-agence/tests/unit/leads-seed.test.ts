import { describe, expect, test } from "vitest";
import { leadsSeedSql, type SeedLead } from "@/lib/leads-seed";

const lead = (overrides: Partial<SeedLead> = {}): SeedLead => ({
  name: "Chez l'Ami",
  city: "Paris",
  category: "Restaurant",
  phone: "01 43 55 12 34",
  email: null,
  instagram: "https://www.instagram.com/chezlami/",
  facebook: null,
  note: null,
  address: "12 rue Oberkampf, 75011 Paris",
  tips: ["Pas de site", "Terrasse l'été", "Angle : menu en ligne"],
  ...overrides,
});

describe("migration de chargement d'une liste", () => {
  test("une ligne par commerce, apostrophes doublées, nulls et infos en tableau", () => {
    const sql = leadsSeedSql([lead(), lead({ name: "Sans infos", tips: [], instagram: null })], "Essai");
    expect(sql).toContain("-- Essai");
    expect(sql).toContain(
      "  ('Chez l''Ami', 'Paris', 'Restaurant', '01 43 55 12 34', null, 'https://www.instagram.com/chezlami/', null, null, '12 rue Oberkampf, 75011 Paris', array['Pas de site', 'Terrasse l''été', 'Angle : menu en ligne']),",
    );
    expect(sql).toContain("  ('Sans infos', 'Paris', 'Restaurant', '01 43 55 12 34', null, null, null, null, '12 rue Oberkampf, 75011 Paris', array[]::text[])\n)");
  });

  test("jamais deux fois le même commerce (même nom, même ville), au jour de la mise en ligne", () => {
    const sql = leadsSeedSql([lead()], "Essai");
    expect(sql).toMatch(/where not exists \(\n {2}select 1 from public\.leads l where lower\(l\.name\) = lower\(v\.name\) and lower\(l\.city\) = lower\(v\.city\)\n\);/);
    expect(sql).toContain("(now() at time zone 'Europe/Paris')::date");
    // Aucune apostrophe non doublée ne peut fermer une chaîne : le nombre total d'apostrophes est pair.
    expect((sql.match(/'/g) ?? []).length % 2).toBe(0);
  });
});
