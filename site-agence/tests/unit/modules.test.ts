import { describe, expect, test } from "vitest";
import { createToken, readToken } from "@/lib/auth/token";
import { monthReportToCsv, prospectsToCsv } from "@/lib/csv";
import { createRateLimiter } from "@/lib/rate-limit";
import { ConfigurationError, resolveRuntimeMode } from "@/lib/runtime-mode";
import { buildMonthReport } from "@/lib/stats";
import { makeMember, makeProspect } from "./helpers";

const SECRET = "x".repeat(40);

describe("jeton de session", () => {
  const payload = { memberId: "lea", version: 2, expiresAt: 2_000_000 };

  test("se relit tel quel avant expiration", () => {
    expect(readToken(createToken(payload, SECRET), SECRET, 1_000_000)).toEqual(payload);
  });

  test("est refusé après expiration", () => {
    expect(readToken(createToken(payload, SECRET), SECRET, 2_000_000)).toBeNull();
  });

  test("est refusé s'il est modifié ou signé avec un autre secret", () => {
    const token = createToken(payload, SECRET);
    expect(readToken(token.replace("lea.", "admin."), SECRET, 1)).toBeNull();
    expect(readToken(token.replace(".2.", ".3."), SECRET, 1)).toBeNull();
    expect(readToken(token, "y".repeat(40), 1)).toBeNull();
  });

  test("ignore les valeurs mal formées", () => {
    expect(readToken(undefined, SECRET)).toBeNull();
    expect(readToken("abc", SECRET)).toBeNull();
    expect(readToken("a.b.c.d.e", SECRET)).toBeNull();
  });
});

describe("limiteur de débit", () => {
  test("bloque au-delà de la limite puis libère après la fenêtre", () => {
    const allow = createRateLimiter({ limit: 2, windowMs: 1_000 });
    expect(allow("ip", 0)).toBe(true);
    expect(allow("ip", 10)).toBe(true);
    expect(allow("ip", 20)).toBe(false);
    expect(allow("autre", 20)).toBe(true);
    expect(allow("ip", 1_011)).toBe(true);
  });

  test("peek vérifie sans compter", () => {
    const allow = createRateLimiter({ limit: 1, windowMs: 1_000 });
    expect(allow("login", 0, { peek: true })).toBe(true);
    expect(allow("login", 0, { peek: true })).toBe(true);
    expect(allow("login", 0)).toBe(true);
    expect(allow("login", 1, { peek: true })).toBe(false);
  });
});

describe("mode de fonctionnement", () => {
  const full = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SECRET_KEY: "sb_secret", SESSION_SECRET: SECRET };

  test("Supabase quand les trois variables sont là", () => {
    expect(resolveRuntimeMode(full)).toEqual({
      kind: "supabase",
      config: { url: full.SUPABASE_URL, secretKey: full.SUPABASE_SECRET_KEY, sessionSecret: SECRET },
    });
  });

  test("refuse une configuration partielle ou un secret trop court", () => {
    expect(() => resolveRuntimeMode({ SUPABASE_URL: full.SUPABASE_URL })).toThrow(ConfigurationError);
    expect(() => resolveRuntimeMode({ ...full, SESSION_SECRET: "court" })).toThrow(/32 caractères/);
  });

  test("démo en développement, et en production seulement si demandée", () => {
    expect(resolveRuntimeMode({ NODE_ENV: "development" })).toEqual({ kind: "demo" });
    expect(() => resolveRuntimeMode({ NODE_ENV: "production" })).toThrow(ConfigurationError);
    expect(resolveRuntimeMode({ NODE_ENV: "production", DEMO_MODE: "1" })).toEqual({ kind: "demo" });
  });
});

describe("export CSV", () => {
  test("neutralise les formules et protège les séparateurs", () => {
    const members = [makeMember("a", { fullName: "Léa ; Fontaine" })];
    const csv = prospectsToCsv(
      [makeProspect({ memberId: "a", name: "=HYPERLINK(\"x\")", city: "Lyon", note: "ligne 1\nligne 2" })],
      members,
    );
    expect(csv.startsWith("﻿Date;")).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain(`"Léa ; Fontaine"`);
    expect(csv).toContain(`"ligne 1\nligne 2"`);
  });

  test("nomme « Ancien membre » un auteur disparu", () => {
    expect(prospectsToCsv([makeProspect({ memberId: "parti" })], [])).toContain("Ancien membre");
  });

  test("le bilan a une ligne par membre et une ligne d'équipe", () => {
    const members = [makeMember("a"), makeMember("b")];
    const report = buildMonthReport(members, [{ memberId: "a", date: "2026-10-01", count: 3 }], "2026-10");
    const lines = monthReportToCsv(report).split("\r\n");
    expect(lines).toHaveLength(4);
    expect(lines[3]).toMatch(/^;Équipe;;3;/);
  });
});
