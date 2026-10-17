import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { parseSeedProspect, prospectsSeedSql, uniqueProspects, type SeedProspect } from "@/lib/prospects-seed";

const FILE = "data/prospects-importes-2026-10.json";
const MIGRATION = "supabase/migrations/0012_contacts_deja_faits.sql";
const TITLE = "Contacts déjà faits : mails de Paul (08-15/10) et listes d'appels de Gabriel et Maxime (15/10/2026)";

describe("contacts déjà faits, ajoutés aux prospects des membres", () => {
  test("une ligne est vérifiée comme dans le formulaire", () => {
    const ok = parseSeedProspect({ membre: "Gabriel", nom: "Cf Coiffure", ville: "Six-Fours", moyen: "telephone", contact: "04 94 88 65 96", note: null, date: "2026-10-15" });
    expect(ok).toEqual({
      ok: true,
      prospect: { member: "gabriel", name: "Cf Coiffure", city: "Six-Fours", channel: "telephone", contact: "04 94 88 65 96", note: null, date: "2026-10-15" },
    });
    expect(parseSeedProspect({ membre: "", nom: "X", ville: "Y", moyen: "telephone", date: "2026-10-15" }).ok).toBe(false);
    expect(parseSeedProspect({ membre: "paul", nom: "X", ville: "Toulon", moyen: "pigeon", date: "2026-10-15" }).ok).toBe(false);
    expect(parseSeedProspect({ membre: "paul", nom: "Le Zinc", ville: "Toulon", moyen: "email", date: "15/10/2026" }).ok).toBe(false);
  });

  test("un même commerce n'est compté qu'une fois par membre", () => {
    const base: SeedProspect = { member: "paul", name: "Le Zinc", city: "Toulon", channel: "email", contact: null, note: null, date: "2026-10-14" };
    const list = uniqueProspects([base, { ...base, name: "LE ZINC" }, { ...base, member: "gabriel" }]);
    expect(list.map((p) => p.member)).toEqual(["paul", "gabriel"]);
    const sql = prospectsSeedSql([{ ...base, name: "L'Ami" }], "Essai");
    expect(sql).toContain("('paul', 'L''Ami', 'ami', 'Toulon', 'toulon', 'email', null, null, '2026-10-14')");
    expect(sql).toContain("where p.member_id = who.id and p.name_key = v.name_key and p.city_key = v.city_key");
  });

  test("le fichier : 287 mails de Paul, 50 appels de Gabriel, 50 de Maxime, et la migration lui correspond", () => {
    const rows = JSON.parse(readFileSync(FILE, "utf8")) as unknown[];
    const parsed = rows.map(parseSeedProspect);
    expect(parsed.filter((result) => !result.ok)).toEqual([]);
    const prospects = parsed.flatMap((result) => (result.ok ? [result.prospect] : []));
    const byMember = Object.fromEntries(["paul", "gabriel", "maxime"].map((m) => [m, uniqueProspects(prospects).filter((p) => p.member === m).length]));
    expect(byMember).toEqual({ paul: 287, gabriel: 50, maxime: 50 });
    expect(readFileSync(MIGRATION, "utf8")).toBe(prospectsSeedSql(prospects, TITLE));
  });
});
