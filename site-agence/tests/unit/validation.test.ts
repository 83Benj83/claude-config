import { describe, expect, test } from "vitest";
import {
  entrySchema,
  fieldErrors,
  isEditableDate,
  loginSchema,
  memberUpdateSchema,
  signupSchema,
} from "@/lib/validation";

describe("entrySchema", () => {
  test("accepts a valid entry and coerces form strings", () => {
    expect(entrySchema.parse({ date: "2026-10-13", count: "42" })).toEqual({
      date: "2026-10-13",
      count: 42,
    });
  });

  test.each([
    [{ date: "2026-10-13", count: "-1" }, "count"],
    [{ date: "2026-10-13", count: "2.5" }, "count"],
    [{ date: "2026-10-13", count: "501" }, "count"],
    [{ date: "2026-10-13", count: "abc" }, "count"],
    [{ date: "2026-02-31", count: "3" }, "date"],
  ])("rejects %o", (input, field) => {
    const result = entrySchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error)).toHaveProperty(field);
  });
});

describe("isEditableDate", () => {
  test("today and the last 7 days are editable", () => {
    expect(isEditableDate("2026-10-13", "2026-10-13")).toBe(true);
    expect(isEditableDate("2026-10-06", "2026-10-13")).toBe(true);
  });

  test("the future and older days are locked", () => {
    expect(isEditableDate("2026-10-14", "2026-10-13")).toBe(false);
    expect(isEditableDate("2026-10-05", "2026-10-13")).toBe(false);
  });
});

describe("auth schemas", () => {
  test("login requires a valid email", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "lea@agence.fr", password: "x" }).success).toBe(true);
  });

  test("signup enforces a 10 character password and trims the name", () => {
    const short = signupSchema.safeParse({
      fullName: "Léa Fontaine",
      email: "lea@agence.fr",
      password: "court",
      inviteCode: "abc",
    });
    expect(short.success).toBe(false);

    const ok = signupSchema.parse({
      fullName: "  Léa Fontaine ",
      email: "lea@agence.fr",
      password: "un-mot-de-passe-long",
      inviteCode: " abc ",
    });
    expect(ok.fullName).toBe("Léa Fontaine");
    expect(ok.inviteCode).toBe("abc");
  });
});

describe("memberUpdateSchema", () => {
  const base = {
    id: "m1",
    fullName: "Léa Fontaine",
    jobTitle: "Prospectrice",
    department: "",
    managerId: "",
    avatarUrl: "",
    isProspector: true,
    isAdmin: false,
  };

  test("empty optional fields become null", () => {
    expect(memberUpdateSchema.parse(base)).toMatchObject({
      department: null,
      managerId: null,
      avatarUrl: null,
    });
  });

  test("avatar URLs must be https", () => {
    const result = memberUpdateSchema.safeParse({ ...base, avatarUrl: "javascript:alert(1)" });
    expect(result.success).toBe(false);
    expect(memberUpdateSchema.safeParse({ ...base, avatarUrl: "https://cdn.fr/a.jpg" }).success).toBe(true);
  });

  test("fieldErrors falls back to a form-level key", () => {
    const result = memberUpdateSchema.safeParse({ ...base, fullName: "L" });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).fullName).toBe("Nom trop court.");
  });
});
