import { describe, expect, test } from "vitest";
import { DemoRepository } from "@/lib/data/demo-repository";
import * as leads from "@/lib/services/leads";
import type { Lead } from "@/lib/types";
import { makeMember } from "./helpers";

const TODAY = "2026-10-14";
const clock = { today: TODAY, now: `${TODAY}T10:00:00.000Z` };
const admin = makeMember("admin", { isAdmin: true, fullName: "Camille Admin" });
const lea = makeMember("lea", { fullName: "Léa Fontaine" });
const theo = makeMember("theo", { fullName: "Théo Garnier" });

const lead = (id: string, overrides: Partial<Lead> = {}): Lead => ({
  id,
  name: `Commerce ${id}`,
  city: "Toulon",
  category: "Restaurant",
  phone: "06 12 34 56 78",
  email: "contact@commerce.fr",
  instagram: null,
  facebook: null,
  note: "Pas de site",
  listDay: TODAY,
  status: "open",
  doneBy: null,
  doneAt: null,
  prospectId: null,
  createdAt: `${TODAY}T06:00:00.000Z`,
  ...overrides,
});

const repositoryWith = (list: Lead[]) =>
  new DemoRepository({
    members: [admin, lea, theo].map((member) => ({ member, passwordHash: null, sessionVersion: 1 })),
    prospects: [],
    resources: [],
    contracts: [],
    leads: list,
  });

describe("cocher un commerce de la liste", () => {
  test("il quitte la liste et devient un prospect du jour de la personne, avec la coordonnée utilisée", async () => {
    const repository = repositoryWith([lead("a")]);
    const result = await leads.claimLead(repository, lea, { id: "a", channel: "email" }, clock);
    expect(result).toMatchObject({ ok: true, message: "Commerce a ajouté à tes prospects du jour." });
    const [prospect] = await repository.listProspects({ from: TODAY, to: TODAY });
    expect(prospect).toMatchObject({ memberId: "lea", name: "Commerce a", city: "Toulon", channel: "email", contact: "contact@commerce.fr", note: "Pas de site", date: TODAY });
    expect(await repository.getLead("a")).toMatchObject({ status: "done", doneBy: "lea", doneAt: clock.now, prospectId: prospect.id });
  });

  test("déjà coché par quelqu'un d'autre : refusé, sans prospect en double", async () => {
    const repository = repositoryWith([lead("a")]);
    await leads.claimLead(repository, lea, { id: "a", channel: "telephone" }, clock);
    expect(await leads.claimLead(repository, theo, { id: "a", channel: "telephone" }, clock)).toEqual({
      ok: false,
      message: "Léa Fontaine l'a déjà coché.",
    });
    expect(await repository.listProspects()).toHaveLength(1);
  });

  test("moyen de contact obligatoire et commerce existant", async () => {
    const repository = repositoryWith([lead("a")]);
    expect(await leads.claimLead(repository, lea, { id: "a", channel: "pigeon" }, clock)).toEqual({
      ok: false,
      message: "Choisis comment tu l'as contacté.",
    });
    expect(await leads.claimLead(repository, lea, { id: "zzz", channel: "email" }, clock)).toEqual({
      ok: false,
      message: "Ce commerce n'est plus dans la liste.",
    });
  });
});

describe("annuler une coche", () => {
  test("la personne qui a coché le remet dans la liste, et son prospect est retiré", async () => {
    const repository = repositoryWith([lead("a")]);
    await leads.claimLead(repository, lea, { id: "a", channel: "telephone" }, clock);
    expect(await leads.releaseLead(repository, theo, "a", clock)).toEqual({
      ok: false,
      message: "Seule la personne qui l'a coché peut annuler.",
    });
    expect(await leads.releaseLead(repository, lea, "a", clock)).toMatchObject({ ok: true });
    expect(await repository.getLead("a")).toMatchObject({ status: "open", doneBy: null, prospectId: null });
    expect(await repository.listProspects()).toHaveLength(0);
  });

  test("le jour même seulement, sauf pour un admin", async () => {
    const repository = repositoryWith([lead("a", { status: "done", doneBy: "lea", doneAt: "2026-10-13T10:00:00.000Z" })]);
    expect(await leads.releaseLead(repository, lea, "a", clock)).toEqual({ ok: false, message: "Une coche ne s'annule que le jour même." });
    expect(await leads.releaseLead(repository, admin, "a", clock)).toMatchObject({ ok: true });
  });
});

describe("gérer la liste", () => {
  test("seul un admin retire un commerce", async () => {
    const repository = repositoryWith([lead("a")]);
    expect(await leads.deleteLead(repository, lea, "a")).toMatchObject({ ok: false });
    expect(await leads.deleteLead(repository, admin, "a")).toMatchObject({ ok: true });
    expect(await repository.getLead("a")).toBeNull();
  });

  test("ajout d'une liste : lignes vérifiées, l'ancienne liste rangée sur demande", async () => {
    const repository = repositoryWith([lead("old")]);
    const result = await leads.addLeadList(
      repository,
      [{ nom: "Le Zinc", ville: "La Garde", instagram: "@lezinc" }, { nom: "Sans ville" }],
      { listDay: TODAY, now: clock.now, replace: true },
    );
    expect(result).toEqual({ added: 1, archived: 1, rejected: [{ line: 2, message: "La ville manque." }] });
    const list = await repository.listLeads(`${TODAY}T00:00:00.000Z`);
    expect(list.map((l) => l.name)).toEqual(["Le Zinc"]);
  });
});
