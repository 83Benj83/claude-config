import type { Member, Prospect } from "@/lib/types";

export const makeMember = (id: string, overrides: Partial<Member> = {}): Member => ({
  id,
  login: id,
  fullName: `Membre ${id}`,
  jobTitle: "Prospecteur",
  department: "Commercial",
  managerId: null,
  avatarUrl: null,
  isProspector: true,
  isAdmin: false,
  active: true,
  sortOrder: 0,
  welcomedAt: "2026-01-01T00:00:00.000Z",
  lastLoginAt: null,
  ...overrides,
});

let counter = 0;
export const makeProspect = (overrides: Partial<Prospect> = {}): Prospect => {
  counter += 1;
  const date = overrides.date ?? "2026-10-13";
  return {
    id: `p${counter}`,
    memberId: "a",
    name: `Restaurant ${counter}`,
    city: "Lyon",
    channel: "telephone",
    contact: null,
    note: null,
    date,
    createdAt: `${date}T10:${String(counter % 60).padStart(2, "0")}:00.000Z`,
    ...overrides,
  };
};
