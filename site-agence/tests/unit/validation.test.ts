import { describe, expect, test } from "vitest";
import { fieldErrors, isEditableDate, loginSchema, memberSchema, prospectSchema, resourceSchema, welcomeSchema } from "@/lib/validation";

describe("prospectSchema", () => {
  const valid = { name: " Le Petit Zinc ", city: "Lyon", channel: "instagram", contact: "", note: "", date: "2026-10-13" };

  test("accepts a valid prospect, trims and nulls empty optional fields", () => {
    expect(prospectSchema.parse(valid)).toEqual({
      name: "Le Petit Zinc",
      city: "Lyon",
      channel: "instagram",
      contact: null,
      note: null,
      date: "2026-10-13",
    });
  });

  test.each([
    [{ name: "" }, "name"],
    [{ city: "L" }, "city"],
    [{ channel: "pigeon" }, "channel"],
    [{ date: "2026-02-31" }, "date"],
    [{ name: "Zinc\r=cmd" }, "name"],
  ])("rejects %o", (patch, field) => {
    const result = prospectSchema.safeParse({ ...valid, ...patch });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error)).toHaveProperty(field);
  });
});

describe("isEditableDate", () => {
  test("today and the last 7 days only", () => {
    expect(isEditableDate("2026-10-13", "2026-10-13")).toBe(true);
    expect(isEditableDate("2026-10-06", "2026-10-13")).toBe(true);
    expect(isEditableDate("2026-10-05", "2026-10-13")).toBe(false);
    expect(isEditableDate("2026-10-14", "2026-10-13")).toBe(false);
  });
});

describe("auth schemas", () => {
  test("login needs an identifier and a password", () => {
    expect(loginSchema.safeParse({ login: "", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ login: "lea", password: "" }).success).toBe(false);
    expect(loginSchema.parse({ login: " lea ", password: "x" }).login).toBe("lea");
  });

  test("welcome confirms the name and job title", () => {
    expect(welcomeSchema.safeParse({ fullName: "Léa Fontaine" }).success).toBe(true);
    expect(welcomeSchema.safeParse({ fullName: "L" }).success).toBe(false);
  });
});

describe("memberSchema", () => {
  const base = {
    id: "",
    login: "lea",
    fullName: "Léa Fontaine",
    jobTitle: "Prospectrice",
    department: "",
    managerId: "",
    avatarUrl: "",
    password: "",
    isProspector: true,
    isAdmin: false,
    active: true,
  };

  test("empty optional fields become null and an empty password means unchanged", () => {
    expect(memberSchema.parse(base)).toMatchObject({ id: null, department: null, managerId: null, avatarUrl: null, password: "" });
  });

  test("short passwords and non-https avatars are refused", () => {
    expect(fieldErrors(memberSchema.safeParse({ ...base, password: "abc" }).error!)).toHaveProperty("password");
    expect(memberSchema.safeParse({ ...base, avatarUrl: "javascript:alert(1)" }).success).toBe(false);
  });
});

describe("resourceSchema", () => {
  test("validates the value according to its kind", () => {
    expect(resourceSchema.safeParse({ id: "", kind: "email", title: "Devis", value: "pas-un-mail", note: "" }).success).toBe(false);
    expect(resourceSchema.safeParse({ id: "", kind: "link", title: "Portfolio", value: "javascript:x", note: "" }).success).toBe(false);
    const template = resourceSchema.parse({ id: "", kind: "template", title: "Relance", value: "Bonjour,\nMerci", note: "" });
    expect(template).toMatchObject({ id: null, note: null, sortOrder: 0 });
  });
});
