import { describe, expect, test } from "vitest";
import {
  analyzeRows,
  channelFromContact,
  establishmentKey,
  parseChannel,
  parseDate,
  readTable,
  sanitizeRows,
  toFormValues,
  type ImportOptions,
} from "@/lib/prospect-import";

const TODAY = "2026-10-14";
const options: ImportOptions = { defaultCity: "", defaultChannel: "", useToday: false, today: TODAY };

describe("lecture d'un fichier de prospects", () => {
  test("reconnaît les titres usuels, dans n'importe quel ordre", () => {
    const table = readTable([
      ["Ville", "Nom du restaurant", "Moyen de contact", "Téléphone", "Commentaire", "Date de contact"],
      ["Lyon", "Le Bistrot du Port", "Appel", 612345678, "Rappeler lundi", "13/10/2026"],
      [null, null, null, null, null, null],
      ["Marseille", "Chez Nino", "", "contact@chez-nino.fr", "", ""],
    ]);
    expect(table.hasHeader).toBe(true);
    expect(toFormValues(table, options)).toEqual([
      { name: "Le Bistrot du Port", city: "Lyon", channel: "telephone", contact: "0612345678", note: "Rappeler lundi", date: "2026-10-13" },
      { name: "Chez Nino", city: "Marseille", channel: "email", contact: "contact@chez-nino.fr", note: "", date: TODAY },
    ]);
  });

  test("sans titres : nom, ville, moyen, coordonnées… dans cet ordre ; valeurs par défaut", () => {
    const table = readTable([["Pizzeria Roma"], ["Boulangerie Martin"]]);
    expect(table.hasHeader).toBe(false);
    const rows = toFormValues(table, { ...options, defaultCity: "Nice", defaultChannel: "visite" });
    expect(rows.map((row) => [row.name, row.city, row.channel])).toEqual([
      ["Pizzeria Roma", "Nice", "visite"],
      ["Boulangerie Martin", "Nice", "visite"],
    ]);
  });

  test("moyens de contact, coordonnées et dates en français", () => {
    expect(parseChannel("Sur place")).toBe("visite");
    expect(parseChannel("E-mail")).toBe("email");
    expect(parseChannel("insta")).toBe("instagram");
    expect(parseChannel("pigeon voyageur")).toBeNull();
    expect(channelFromContact("06 12 34 56 78")).toBe("telephone");
    expect(channelFromContact("@lebistrot")).toBe("instagram");
    expect(parseDate("14/10/26", TODAY)).toBe("2026-10-14");
    expect(parseDate("9.10", TODAY)).toBe("2026-10-09");
    expect(parseDate(new Date("2026-10-12T00:00:00Z"), TODAY)).toBe("2026-10-12");
    expect(parseDate("31/02/2026", TODAY)).toBeNull();
  });

  test("toutes les lignes à la date du jour si demandé", () => {
    const table = readTable([["Nom", "Ville", "Date"], ["A", "Lyon", "01/01/2026"]]);
    expect(toFormValues(table, { ...options, useToday: true })[0].date).toBe(TODAY);
  });
});

describe("vérification des lignes", () => {
  const row = (name: string, city = "Lyon", extra: Partial<Record<string, string>> = {}) => ({
    name,
    city,
    channel: "telephone",
    contact: "",
    note: "",
    date: TODAY,
    ...extra,
  });

  test("prête, déjà contactée, en double dans le fichier, ou à corriger", () => {
    const known = new Set([establishmentKey("Le Café des Arts", "Lyon")]);
    const statuses = analyzeRows(
      [
        row("Pizzeria Roma"),
        row("cafe des arts"),
        row("Pizzeria ROMA"),
        row("X"),
        row("Chez Paul", "Lyon", { date: "2026-09-01" }),
        row("Chez Léa", "Lyon", { channel: "" }),
      ],
      known,
      TODAY,
    );
    expect(statuses.map((s) => s.status)).toEqual(["ready", "known", "duplicate", "invalid", "invalid", "invalid"]);
    expect(statuses[5]).toMatchObject({ message: "Choisis le moyen de contact." });
  });

  test("n'accepte qu'une liste de lignes de texte, 500 au plus", () => {
    expect(sanitizeRows("pas une liste")).toBeNull();
    expect(sanitizeRows([])).toBeNull();
    expect(sanitizeRows(Array.from({ length: 501 }, () => ({})))).toBeNull();
    expect(sanitizeRows([{ name: 12, city: "Lyon" }])).toEqual([{ name: "", city: "Lyon", channel: "", contact: "", note: "", date: "" }]);
  });
});

describe("import côté serveur", () => {
  test("revérifie chaque ligne, garde l'ordre du fichier et n'ajoute les déjà contactés que sur demande", async () => {
    const { DemoRepository } = await import("@/lib/data/demo-repository");
    const { importProspects, analyzeImport } = await import("@/lib/services/prospects");
    const { makeMember, makeProspect } = await import("./helpers");
    const lea = makeMember("lea");
    const repo = new DemoRepository({
      members: [{ member: lea, passwordHash: null, sessionVersion: 1 }],
      prospects: [makeProspect({ name: "Le Café des Arts", city: "Lyon", date: TODAY })],
      resources: [],
      contracts: [],
    });
    const clock = { today: TODAY, now: `${TODAY}T10:00:00.000Z` };
    const line = (name: string) => ({ name, city: "Lyon", channel: "telephone", contact: "", note: "", date: TODAY });
    const rows = [line("Pizzeria Roma"), line("Cafe des arts"), line("X"), line("Boulangerie Martin")];

    const analysis = await analyzeImport(repo, rows, TODAY);
    expect(analysis.ok && analysis.data.map((s) => s.status)).toEqual(["ready", "known", "invalid", "ready"]);

    const result = await importProspects(repo, lea, { rows, includeKnown: false }, clock);
    expect(result).toMatchObject({ ok: true, data: { added: 2, skipped: 2 } });
    const added = (await repo.listProspects()).filter((p) => p.memberId === lea.id && p.name !== "Le Café des Arts");
    expect(added.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((p) => p.name)).toEqual(["Pizzeria Roma", "Boulangerie Martin"]);

    const again = await importProspects(repo, lea, { rows: [line("Cafe des arts")], includeKnown: true }, clock);
    expect(again).toMatchObject({ ok: true, data: { added: 1 } });
    expect(await importProspects(repo, lea, { rows: [line("X")], includeKnown: true }, clock)).toMatchObject({ ok: false });
    expect(await importProspects(repo, lea, { rows: "pas une liste", includeKnown: false }, clock)).toMatchObject({ ok: false });
  });
});
