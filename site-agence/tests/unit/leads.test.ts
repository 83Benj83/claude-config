import { describe, expect, test } from "vitest";
import { buildLeadsView, contactFor, facebookUrl, instagramUrl, leadContacts, parseLead } from "@/lib/leads";
import type { Lead } from "@/lib/types";
import { makeMember, makeProspect } from "./helpers";

const today = "2026-10-14";

const lead = (id: string, overrides: Partial<Lead> = {}): Lead => ({
  id,
  name: `Commerce ${id}`,
  city: "Toulon",
  category: "Restaurant",
  phone: null,
  email: null,
  instagram: null,
  facebook: null,
  note: null,
  listDay: today,
  status: "open",
  doneBy: null,
  doneAt: null,
  prospectId: null,
  addedBy: null,
  batchId: null,
  outcome: null,
  createdAt: "2026-10-14T06:00:00.000Z",
  ...overrides,
});

describe("reading a lead", () => {
  test("French or English column names, links cleaned up", () => {
    const parsed = parseLead(
      { nom: "  Le  Zinc ", ville: "La Garde", catégorie: "Bar", téléphone: "06 12 34 56 78", instagram: "@lezinc", facebook: "https://www.facebook.com/lezinc" },
      today,
    );
    expect(parsed).toEqual({
      ok: true,
      lead: {
        name: "Le Zinc",
        city: "La Garde",
        category: "Bar",
        phone: "06 12 34 56 78",
        email: null,
        instagram: "https://www.instagram.com/lezinc/",
        facebook: "https://www.facebook.com/lezinc",
        note: null,
        listDay: today,
      },
    });
  });

  test("name and city are required; unsafe links are dropped", () => {
    expect(parseLead({ name: "Sans ville" }, today)).toEqual({ ok: false, message: "La ville manque." });
    expect(parseLead({ city: "Toulon" }, today)).toEqual({ ok: false, message: "Le nom manque." });
    expect(instagramUrl("javascript:alert(1)")).toBeNull();
    expect(instagramUrl("https://evil.example/instagram.com")).toBeNull();
    expect(instagramUrl("https://instagram.com/le.zinc")).toBe("https://instagram.com/le.zinc");
    expect(facebookUrl("http://facebook.com/x")).toBeNull();
    expect(facebookUrl("https://m.facebook.com/lezinc")).toBe("https://m.facebook.com/lezinc");
    const parsed = parseLead({ name: "X", city: "Y", email: "pas-un-mail", phone: "12" }, today);
    expect(parsed.ok && [parsed.lead.email, parsed.lead.phone]).toEqual([null, null]);
  });

  test("contacts in a fixed order, and the one used for each channel", () => {
    const withAll = lead("a", { phone: "06 12 34 56 78", email: "a@b.fr", instagram: "https://www.instagram.com/a/", facebook: "https://www.facebook.com/a" });
    expect(leadContacts(withAll).map((c) => c.channel)).toEqual(["telephone", "email", "instagram", "facebook"]);
    expect(contactFor(withAll, "email")).toBe("a@b.fr");
    expect(contactFor(withAll, "visite")).toBeNull();
  });
});

describe("leads view", () => {
  const members = [makeMember("lea", { fullName: "Léa" }), makeMember("max", { fullName: "Max", isAdmin: true })];

  test("open leads by city, already contacted ones flagged, today's ticks with undo rights", () => {
    const view = buildLeadsView({
      leads: [
        lead("b", { name: "Burger Bonheur", city: "Toulon" }),
        lead("a", { name: "Atelier", city: "Hyères" }),
        lead("c", { name: "Le Zinc", city: "La Garde" }),
        lead("d", { name: "Déjà fait", status: "done", doneBy: "lea", doneAt: "2026-10-14T08:00:00.000Z", prospectId: "p1" }),
        lead("e", { name: "Hier", status: "done", doneBy: "lea", doneAt: "2026-10-13T08:00:00.000Z" }),
      ],
      members,
      contacted: [makeProspect({ memberId: "max", name: "le zinc", city: "LA GARDE", date: "2026-10-10", channel: "instagram" })],
      me: members[0],
      today,
    });
    expect(view.open.map((row) => row.lead.name)).toEqual(["Atelier", "Le Zinc", "Burger Bonheur"]);
    expect(view.cities).toEqual([
      { city: "Hyères", count: 1 },
      { city: "La Garde", count: 1 },
      { city: "Toulon", count: 1 },
    ]);
    expect(view.open[1].known).toEqual({ name: "Max", date: "2026-10-10", channel: "instagram" });
    expect(view.open[0].known).toBeNull();
    expect(view.doneToday).toHaveLength(1);
    expect(view.doneToday[0]).toMatchObject({ doneByName: "Léa", canUndo: true });
    expect(view.canManage).toBe(false);
    expect(view.listDay).toBe(today);
  });

  test("only the person who ticked, or an admin, can undo", () => {
    const leads = [lead("d", { status: "done", doneBy: "lea", doneAt: "2026-10-14T08:00:00.000Z" })];
    const asMax = buildLeadsView({ leads, members, contacted: [], me: members[1], today });
    expect([asMax.doneToday[0].canUndo, asMax.canManage]).toEqual([true, true]);
    const asOther = buildLeadsView({ leads, members, contacted: [], me: makeMember("zoe"), today });
    expect(asOther.doneToday[0].canUndo).toBe(false);
  });
});
