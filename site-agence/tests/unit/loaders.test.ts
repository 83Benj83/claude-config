import { describe, expect, test } from "vitest";
import { createDemoState, DemoRepository } from "@/lib/data/demo-repository";
import { DEMO_MEMBERS, generateDemoProspects } from "@/lib/data/demo-seed";
import { firstName, formatDelta, formatRank, pluralize } from "@/lib/format";
import * as loaders from "@/lib/services/loaders";
import { exportCsv } from "@/lib/services/prospects";

const TODAY = "2026-10-14";

async function demo() {
  const repository = new DemoRepository(await createDemoState(TODAY));
  const me = (await repository.getCredentialsById("lea"))!.member;
  return { repository, me };
}

describe("données de démonstration", () => {
  test("sont identiques d'une génération à l'autre et restent dans la fenêtre", () => {
    const first = generateDemoProspects(TODAY);
    expect(generateDemoProspects(TODAY)).toEqual(first);
    expect(first.length).toBeGreaterThan(300);
    expect(first.every((p) => p.date <= TODAY && p.date >= "2026-08-30")).toBe(true);
  });

  test("chaque compte se connecte avec identifiant + 2026", () => {
    expect(DEMO_MEMBERS.every((m) => m.demoPassword === `${m.login}2026`)).toBe(true);
  });
});

describe("chargement des écrans", () => {
  test("chaque écran se construit à partir des données", async () => {
    const { repository, me } = await demo();
    const choices = await loaders.loadLoginChoices(repository);
    expect(choices[0]).not.toHaveProperty("passwordHash");
    expect(choices.map((c) => c.login)).toContain("recrue");

    const home = await loaders.loadHomeView(repository, me, TODAY);
    expect(home.establishmentsCount).toBe(await repository.countEstablishments());

    expect((await loaders.loadProspectionView(repository, me, TODAY)).days[0].value).toBe(TODAY);
    expect((await loaders.loadDirectoryView(repository, TODAY)).recent.length).toBeGreaterThan(0);
    expect((await loaders.loadRankingView(repository, me, TODAY)).periods.mois.rows.length).toBeGreaterThan(0);
    expect((await loaders.loadTeamView(repository, me, TODAY)).members.length).toBe(DEMO_MEMBERS.length);
    expect((await loaders.loadResourcesView(repository, me)).canEdit).toBe(false);
    expect((await loaders.loadAdminView(repository, me)).departments).toContain("Commercial");
  });

  test("le bilan ignore un mois futur ou invalide", async () => {
    const { repository, me } = await demo();
    expect((await loaders.loadReportView(repository, me, TODAY, "2026-09")).month).toBe("2026-09");
    expect((await loaders.loadReportView(repository, me, TODAY, "2027-01")).month).toBe("2026-10");
    expect((await loaders.loadReportView(repository, me, TODAY, "n'importe quoi")).month).toBe("2026-10");
  });

  test("l'export produit le bilan ou la liste du mois demandé", async () => {
    const { repository, me } = await demo();
    const bilan = await exportCsv(repository, me, { month: "2026-09", kind: "bilan" }, TODAY);
    expect(bilan.ok && bilan.data.filename).toBe("bilan-prospection-2026-09.csv");
    const list = await exportCsv(repository, me, { month: "2099-01", kind: "prospects" }, TODAY);
    expect(list.ok && list.data.filename).toBe("prospects-2026-10.csv");
  });
});

describe("formats", () => {
  test("rangs, variations, prénoms et pluriels", () => {
    expect([formatRank(1), formatRank(2)]).toEqual(["1er", "2e"]);
    expect([formatDelta(3), formatDelta(-2), formatDelta(0)]).toEqual(["+3", "-2", "0"]);
    expect(firstName("  Léa Fontaine ")).toBe("Léa");
    expect([pluralize(1, "prospect"), pluralize(2, "prospect")]).toEqual(["1 prospect", "2 prospects"]);
  });
});
