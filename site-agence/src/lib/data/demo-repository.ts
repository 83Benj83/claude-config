import { todayIso } from "../dates";
import { cityKey, nameKey } from "../establishments";
import { hashPassword } from "../password";
import type { DateRange, IsoDate, Member, Prospect, Resource } from "../types";
import { DEMO_MEMBERS, DEMO_RESOURCES, generateDemoProspects } from "./demo-seed";
import { loginKey, type Credentials, type MemberUpdate, type NewMember, type Repository } from "./repository";

type StoredMember = { member: Member; passwordHash: string | null; sessionVersion: number };

type DemoState = {
  members: StoredMember[];
  prospects: Prospect[];
  resources: Resource[];
};

/** Peu d'itérations en démo : démarrage rapide, mots de passe publics de toute façon. */
const DEMO_HASH_ITERATIONS = 5_000;

export async function createDemoState(today: IsoDate): Promise<DemoState> {
  const members = await Promise.all(
    DEMO_MEMBERS.map(async ({ demoPassword, ...member }) => ({
      member: { ...member },
      passwordHash: await hashPassword(demoPassword, DEMO_HASH_ITERATIONS),
      sessionVersion: 1,
    })),
  );
  return { members, prospects: generateDemoProspects(today), resources: DEMO_RESOURCES.map((r) => ({ ...r })) };
}

const clone = <T,>(value: T): T => structuredClone(value);
const inRange = (date: IsoDate, range?: DateRange) => !range || (date >= range.from && date <= range.to);

/**
 * Stockage en mémoire du mode démo. Les modifications durent tant que le
 * serveur tourne ; un redémarrage remet les données d'exemple.
 */
export class DemoRepository implements Repository {
  constructor(private readonly state: DemoState) {}

  async listMembers(): Promise<Member[]> {
    return this.state.members.map((stored) => clone(stored.member));
  }

  async getCredentialsById(id: string): Promise<Credentials | null> {
    const stored = this.state.members.find((s) => s.member.id === id);
    return stored ? clone(stored) : null;
  }

  async getCredentialsByLogin(login: string): Promise<Credentials | null> {
    const key = loginKey(login);
    const stored = this.state.members.find((s) => loginKey(s.member.login) === key);
    return stored ? clone(stored) : null;
  }

  async createMember({ passwordHash, ...member }: NewMember): Promise<Member> {
    const created: Member = { ...member, id: crypto.randomUUID(), welcomedAt: null, lastLoginAt: null };
    this.state.members.push({ member: created, passwordHash, sessionVersion: 1 });
    return clone(created);
  }

  async updateMember(id: string, { passwordHash, revokeSessions, ...patch }: MemberUpdate): Promise<void> {
    const stored = this.state.members.find((s) => s.member.id === id);
    if (!stored) return;
    stored.member = { ...stored.member, ...patch };
    if (passwordHash) stored.passwordHash = passwordHash;
    if (revokeSessions) stored.sessionVersion += 1;
  }

  async listProspects(range?: DateRange): Promise<Prospect[]> {
    return this.state.prospects.filter((p) => inRange(p.date, range)).map(clone);
  }

  async listRecentProspects(limit: number): Promise<Prospect[]> {
    return [...this.state.prospects]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map(clone);
  }

  async findProspectsByNameToken(token: string): Promise<Prospect[]> {
    return this.state.prospects.filter((p) => nameKey(p.name).includes(token)).map(clone);
  }

  async countEstablishments(): Promise<number> {
    return new Set(this.state.prospects.map((p) => `${nameKey(p.name)}|${cityKey(p.city)}`)).size;
  }

  async getProspect(id: string): Promise<Prospect | null> {
    const prospect = this.state.prospects.find((p) => p.id === id);
    return prospect ? clone(prospect) : null;
  }

  async addProspect(prospect: Prospect): Promise<void> {
    this.state.prospects.push(clone(prospect));
  }

  async deleteProspect(id: string): Promise<void> {
    this.state.prospects = this.state.prospects.filter((p) => p.id !== id);
  }

  async listResources(): Promise<Resource[]> {
    return this.state.resources.map(clone);
  }

  async saveResource(resource: Resource): Promise<void> {
    const index = this.state.resources.findIndex((r) => r.id === resource.id);
    if (index === -1) this.state.resources.push(clone(resource));
    else this.state.resources[index] = clone(resource);
  }

  async deleteResource(id: string): Promise<void> {
    this.state.resources = this.state.resources.filter((r) => r.id !== id);
  }
}

const globalForDemo = globalThis as typeof globalThis & { __demoState?: Promise<DemoState> };

/** État partagé par toutes les requêtes du process (survit au rechargement à chaud). */
export async function getDemoRepository(): Promise<DemoRepository> {
  globalForDemo.__demoState ??= createDemoState(todayIso());
  return new DemoRepository(await globalForDemo.__demoState);
}
