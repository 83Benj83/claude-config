import { describe, expect, test } from "vitest";
import { generatePassword, hashPassword, verifyPassword } from "@/lib/password";

describe("passwords", () => {
  test("hash then verify", async () => {
    const stored = await hashPassword("lea2026", 2_000);
    expect(stored).toMatch(/^pbkdf2\$2000\$/);
    expect(await verifyPassword("lea2026", stored)).toBe(true);
    expect(await verifyPassword("lea2027", stored)).toBe(false);
  });

  test("two hashes of the same password differ (random salt)", async () => {
    expect(await hashPassword("x", 2_000)).not.toBe(await hashPassword("x", 2_000));
  });

  test("malformed or missing hashes never verify", async () => {
    expect(await verifyPassword("x", null)).toBe(false);
    expect(await verifyPassword("x", "plain-text")).toBe(false);
    expect(await verifyPassword("x", "pbkdf2$10$abc$def")).toBe(false);
    expect(await verifyPassword("x", "pbkdf2$2000$***$***")).toBe(false);
  });

  test("generated passwords are readable and of the asked length", () => {
    const password = generatePassword(12);
    expect(password).toHaveLength(12);
    expect(password).toMatch(/^[a-km-np-z2-9]+$/);
  });
});
