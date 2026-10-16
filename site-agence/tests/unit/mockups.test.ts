import { describe, expect, test } from "vitest";
import type { MockupFormValues } from "@/lib/actions-contract";
import { DemoRepository } from "@/lib/data/demo-repository";
import * as mockups from "@/lib/services/mockups";
import { buildContractsView } from "@/lib/views";
import { makeMember } from "./helpers";

const clock = { today: "2026-10-17", now: "2026-10-17T09:00:00.000Z" };
const admin = makeMember("admin", { isAdmin: true });
const julien = makeMember("julien");
const repo = () =>
  new DemoRepository({ members: [admin, julien].map((member) => ({ member, passwordHash: null, sessionVersion: 1 })), prospects: [], resources: [], contracts: [] });

const form = (overrides: Partial<MockupFormValues> = {}): MockupFormValues => ({
  id: "",
  client: "Boulangerie Soleil",
  city: "Toulon",
  contact: "",
  status: "en_cours",
  startedOn: "2026-10-15",
  doneOn: "",
  previewUrl: "",
  madeBy: "julien",
  note: "",
  ...overrides,
});

describe("maquettes", () => {
  test("réservées aux admins pour l'écriture", async () => {
    const repository = repo();
    expect(await mockups.saveMockup(repository, julien, form(), clock)).toMatchObject({ ok: false });
    expect((await mockups.saveMockup(repository, admin, form(), clock)).ok).toBe(true);
    const [saved] = await repository.listMockups();
    expect(await mockups.deleteMockup(repository, julien, saved.id)).toMatchObject({ ok: false });
  });

  test("terminée : date de fin posée, regroupée à part dans la vue", async () => {
    const repository = repo();
    await mockups.saveMockup(repository, admin, form({ client: "En cours" }), clock);
    await mockups.saveMockup(repository, admin, form({ client: "Finie", status: "terminee" }), clock);
    const view = buildContractsView({ contracts: [], mockups: await repository.listMockups(), members: [admin, julien], me: julien, today: clock.today });
    expect(view.mockups.inProgress.map((m) => m.client)).toEqual(["En cours"]);
    expect(view.mockups.done[0]).toMatchObject({ client: "Finie", doneOn: clock.today });
  });

  test("refuse un début dans le futur, une fin avant le début et un lien invalide", async () => {
    const repository = repo();
    expect(await mockups.saveMockup(repository, admin, form({ startedOn: "2026-12-01" }), clock)).toMatchObject({ ok: false, errors: { startedOn: expect.any(String) } });
    expect(await mockups.saveMockup(repository, admin, form({ status: "terminee", doneOn: "2026-10-01" }), clock)).toMatchObject({ ok: false, errors: { doneOn: expect.any(String) } });
    expect(await mockups.saveMockup(repository, admin, form({ previewUrl: "javascript:alert(1)" }), clock)).toMatchObject({ ok: false, errors: { previewUrl: expect.any(String) } });
  });
});
