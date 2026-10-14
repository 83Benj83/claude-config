import { describe, expect, test } from "vitest";
import { buildActivityView, isPresenceDue } from "@/lib/activity";
import type { Contract, LoginEvent, Message, PresenceDay } from "@/lib/types";
import { makeMember, makeProspect } from "./helpers";

// Mercredi 14 octobre 2026 ; Paris est à UTC+2.
const today = "2026-10-14";

const members = [
  makeMember("paul", { fullName: "Paul", isAdmin: true, lastSeenAt: "2026-10-14T12:30:00.000Z", lastLoginAt: "2026-10-01T08:00:00.000Z" }),
  makeMember("lea", { fullName: "Léa", lastSeenAt: "2026-10-14T07:05:00.000Z" }),
  makeMember("max", { fullName: "Max", lastSeenAt: "2026-10-12T16:00:00.000Z" }),
  makeMember("new", { fullName: "Nora", welcomedAt: null }),
  makeMember("old", { fullName: "Olivier", active: false }),
];

const presence: PresenceDay[] = [
  { memberId: "paul", day: today, firstSeenAt: "2026-10-14T08:10:00.000Z", lastSeenAt: "2026-10-14T12:30:00.000Z" },
  { memberId: "lea", day: today, firstSeenAt: "2026-10-14T06:45:00.000Z", lastSeenAt: "2026-10-14T07:05:00.000Z" },
  { memberId: "paul", day: "2026-10-13", firstSeenAt: "2026-10-13T08:00:00.000Z", lastSeenAt: "2026-10-13T09:00:00.000Z" },
  { memberId: "max", day: "2026-10-12", firstSeenAt: "2026-10-12T15:00:00.000Z", lastSeenAt: "2026-10-12T16:00:00.000Z" },
  // Hors des 7 derniers jours : ignoré.
  { memberId: "max", day: "2026-10-01", firstSeenAt: "2026-10-01T15:00:00.000Z", lastSeenAt: "2026-10-01T16:00:00.000Z" },
];

const logins: LoginEvent[] = [
  { id: "1", memberId: "lea", login: "lea", ok: true, at: "2026-10-14T06:45:00.000Z" },
  { id: "2", memberId: null, login: "Léa ", ok: false, at: "2026-10-14T06:44:00.000Z" },
  { id: "3", memberId: null, login: "inconnu", ok: false, at: "2026-10-13T21:00:00.000Z" },
];

const message = (authorId: string, createdAt: string): Message => ({ id: createdAt, authorId, text: "Salut", attachments: [], createdAt });
const contract = (status: Contract["status"]): Contract =>
  ({ id: status, client: "Client", status, signedOn: "2026-10-01" }) as Contract;

const build = () =>
  buildActivityView({
    members,
    presence,
    logins,
    prospects: [
      makeProspect({ memberId: "lea", date: today, createdAt: "2026-10-14T07:00:00.000Z" }),
      makeProspect({ memberId: "lea", date: "2026-10-12", createdAt: "2026-10-14T07:01:00.000Z" }),
      makeProspect({ memberId: "max", date: "2026-10-12", createdAt: "2026-10-12T15:30:00.000Z" }),
      makeProspect({ memberId: "max", date: "2026-10-01", createdAt: "2026-10-01T15:30:00.000Z" }),
    ],
    messages: [message("paul", "2026-10-14T09:00:00.000Z"), message("lea", "2026-10-10T09:00:00.000Z"), message("lea", "2026-09-01T09:00:00.000Z")],
    contracts: [contract("maquette"), contract("validation"), contract("termine")],
    storage: { files: 3, bytes: 5 * 1024 * 1024 },
    establishments: 42,
    statsSince: null,
    today,
  });

describe("presence refresh", () => {
  const now = new Date("2026-10-14T12:00:00.000Z");

  test("first visit, or more than 5 minutes since the last one", () => {
    expect(isPresenceDue(null, now)).toBe(true);
    expect(isPresenceDue("2026-10-14T11:54:00.000Z", now)).toBe(true);
    expect(isPresenceDue("2026-10-14T11:57:00.000Z", now)).toBe(false);
  });

  test("a new day in Paris always counts", () => {
    // 23 h 58 puis 0 h 01 à Paris : deux jours différents, 3 minutes d'écart.
    expect(isPresenceDue("2026-10-14T21:58:00.000Z", new Date("2026-10-14T22:01:00.000Z"))).toBe(true);
  });
});

describe("activity view", () => {
  test("who came today, first arrivals first, then the others by last visit", () => {
    const view = build();
    expect(view.rows.map((row) => row.member.id)).toEqual(["lea", "paul", "max", "new"]);
    expect(view.rows[0].today).toEqual({ firstSeenAt: "2026-10-14T06:45:00.000Z", lastSeenAt: "2026-10-14T07:05:00.000Z" });
    expect(view.rows.find((row) => row.member.id === "max")?.today).toBeNull();
    expect(view.rows.find((row) => row.member.id === "new")?.neverSeen).toBe(true);
    expect(view.totals).toMatchObject({ members: 4, presentToday: 2, prospectsToday: 2, messagesToday: 1, refusedToday: 1 });
  });

  test("seven days of presence and activity per person", () => {
    const view = build();
    expect(view.days).toEqual(["2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14"]);
    const paul = view.rows.find((row) => row.member.id === "paul")!;
    expect(paul.days).toEqual([false, false, false, false, false, true, true]);
    const lea = view.rows.find((row) => row.member.id === "lea")!;
    expect(lea).toMatchObject({ prospectsToday: 2, prospectsWeek: 2, messagesToday: 0, messagesWeek: 1 });
    const max = view.rows.find((row) => row.member.id === "max")!;
    expect(max).toMatchObject({ prospectsToday: 0, prospectsWeek: 1, lastSeenAt: "2026-10-12T16:00:00.000Z" });
    // Le 1er octobre est hors des 7 derniers jours.
    expect(max.days.filter(Boolean)).toHaveLength(1);
  });

  test("last visit falls back on the last sign-in", () => {
    const view = buildActivityView({
      ...{ presence: [], logins: [], prospects: [], messages: [], contracts: [], storage: { files: 0, bytes: 0 }, establishments: 0, statsSince: null, today },
      members: [makeMember("x", { lastLoginAt: "2026-10-02T10:00:00.000Z", lastSeenAt: null })],
    });
    expect(view.rows[0].lastSeenAt).toBe("2026-10-02T10:00:00.000Z");
  });

  test("sign-in log, newest first, with names found from the typed identifier", () => {
    const view = build();
    expect(view.logins.map((event) => [event.ok, event.name, event.login])).toEqual([
      [true, "Léa", "lea"],
      [false, "Léa", "Léa "],
      [false, null, "inconnu"],
    ]);
  });

  test("site figures for admins", () => {
    expect(build().site).toEqual({
      admins: ["Paul"],
      neverConnected: ["Nora"],
      inactive: 1,
      establishments: 42,
      contractsInProgress: 2,
      contractsDone: 1,
      files: 3,
      bytes: 5 * 1024 * 1024,
      quotaBytes: 1024 ** 3,
      statsSince: null,
    });
  });
});
