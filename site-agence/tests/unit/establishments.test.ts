import { describe, expect, test } from "vitest";
import {
  checkDuplicate,
  cityKey,
  groupEstablishments,
  knownCities,
  nameKey,
  normalizeText,
  searchEstablishments,
  searchTokens,
} from "@/lib/establishments";
import { makeMember, makeProspect } from "./helpers";

describe("normalisation", () => {
  test("accents, case, punctuation and ampersands", () => {
    expect(normalizeText("  Crêperie L'Étoile & Co !  ")).toBe("creperie l etoile et co");
  });

  test("nameKey ignores generic words", () => {
    expect(nameKey("Restaurant Le Petit Zinc")).toBe("petit zinc");
    expect(nameKey("le petit zinc")).toBe("petit zinc");
    expect(nameKey("Chez Paulette")).toBe("paulette");
  });

  test("nameKey never becomes empty", () => {
    expect(nameKey("Le Resto")).toBe("le resto");
  });

  test("cityKey expands saint abbreviations", () => {
    expect(cityKey("St-Étienne")).toBe("saint etienne");
    expect(cityKey("Saint Étienne")).toBe("saint etienne");
    expect(cityKey("Ste Foy")).toBe("sainte foy");
  });

  test("searchTokens drops one-letter words", () => {
    expect(searchTokens("le p zinc")).toEqual(["zinc"]);
  });
});

describe("establishments", () => {
  const members = [makeMember("a", { fullName: "Alice" }), makeMember("b", { fullName: "Bruno" })];
  const prospects = [
    makeProspect({ memberId: "a", name: "Restaurant Le Petit Zinc", city: "LYON", date: "2026-10-01", channel: "telephone" }),
    makeProspect({ memberId: "b", name: "le petit zinc", city: "Lyon", date: "2026-10-12", channel: "instagram" }),
    makeProspect({ memberId: "a", name: "Le Petit Zinc", city: "Annecy", date: "2026-10-05" }),
    makeProspect({ memberId: "b", name: "Pizzeria Bella Napoli", city: "Marseille", date: "2026-10-11" }),
    makeProspect({ memberId: "ghost", name: "Sushi Kyo", city: "Nice", date: "2026-10-02" }),
  ];
  const establishments = groupEstablishments(prospects, members);

  test("groups spelling variants of the same place in the same city", () => {
    const zincLyon = establishments.find((e) => e.city.toLowerCase() === "lyon");
    expect(zincLyon?.contacts).toHaveLength(2);
    expect(zincLyon?.name).toBe("le petit zinc");
    expect(zincLyon?.contacts.map((c) => c.memberName)).toEqual(["Bruno", "Alice"]);
    expect(zincLyon?.lastDate).toBe("2026-10-12");
  });

  test("keeps the same name in another city separate", () => {
    expect(establishments).toHaveLength(4);
  });

  test("unknown members are labelled", () => {
    expect(establishments.find((e) => e.city === "Nice")?.contacts[0].memberName).toBe("Ancien membre");
  });

  test("sorted by most recent contact", () => {
    expect(establishments.map((e) => e.lastDate)).toEqual(["2026-10-12", "2026-10-11", "2026-10-05", "2026-10-02"]);
  });

  test("search tolerates partial words, accents and articles", () => {
    expect(searchEstablishments(establishments, "petit zi").map((e) => e.city)).toEqual(["Lyon", "Annecy"]);
    expect(searchEstablishments(establishments, "BELLA").map((e) => e.name)).toEqual(["Pizzeria Bella Napoli"]);
    expect(searchEstablishments(establishments, "petit zinc", "lyo")).toHaveLength(1);
    expect(searchEstablishments(establishments, "kebab")).toEqual([]);
    expect(searchEstablishments(establishments, "a")).toEqual([]);
  });

  test("exact matches rank first", () => {
    const more = groupEstablishments(
      [makeProspect({ name: "Zinc", city: "Lyon" }), makeProspect({ name: "Le Zinc Doré", city: "Lyon", date: "2026-10-13" })],
      members,
    );
    expect(searchEstablishments(more, "zinc")[0].name).toBe("Zinc");
  });

  test("checkDuplicate separates same city from other cities", () => {
    const check = checkDuplicate(establishments, "Le petit Zinc", "lyon");
    expect(check.sameCity?.contacts).toHaveLength(2);
    expect(check.otherCities.map((e) => e.city)).toEqual(["Annecy"]);

    const noCity = checkDuplicate(establishments, "petit zinc", "");
    expect(noCity.sameCity).toBeNull();
    expect(noCity.otherCities).toHaveLength(2);

    expect(checkDuplicate(establishments, "x", "Lyon")).toEqual({ sameCity: null, otherCities: [] });
  });

  test("knownCities lists the most used spelling first", () => {
    expect(knownCities(prospects)[0]).toBe("LYON");
    expect(knownCities(prospects)).toHaveLength(4);
  });
});
