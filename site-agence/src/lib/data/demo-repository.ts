import { todayIso } from "../dates";
import { cityKey, nameKey } from "../establishments";
import { hashPassword } from "../password";
import type { Contract, DateRange, Entry, IsoDate, Lead, LoginEvent, Member, Message, PresenceDay, Prospect, Resource, StoredFile } from "../types";
import { countedSince, entriesFromProspects } from "../views";
import { DEMO_MEMBERS, DEMO_RESOURCES, demoLeads, generateDemoProspects } from "./demo-seed";
import { loginKey, type Credentials, type MemberUpdate, type NewFile, type NewMember, type Repository } from "./repository";

type StoredMember = { member: Member; passwordHash: string | null; sessionVersion: number };

type DemoState = {
  members: StoredMember[];
  prospects: Prospect[];
  resources: Resource[];
  contracts: Contract[];
  statsSince?: string | null;
  messages?: Message[];
  files?: Map<string, { file: StoredFile; bytes: Uint8Array }>;
  presence?: PresenceDay[];
  logins?: LoginEvent[];
  leads?: Lead[];
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
  return {
    members,
    prospects: generateDemoProspects(today),
    resources: DEMO_RESOURCES.map((r) => ({ ...r })),
    // Aucun contrat d'exemple : l'équipe saisit les siens.
    contracts: [],
    leads: demoLeads(today),
  };
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
    const created: Member = { ...member, id: crypto.randomUUID(), welcomedAt: null, lastLoginAt: null, lastSeenAt: null };
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

  async listEntries(range: DateRange, since: string | null): Promise<Entry[]> {
    return entriesFromProspects(countedSince(await this.listProspects(range), since));
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

  async addProspects(prospects: Prospect[]): Promise<void> {
    this.state.prospects.push(...prospects.map(clone));
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

  async listContracts(): Promise<Contract[]> {
    return this.state.contracts.map(clone);
  }

  async getContract(id: string): Promise<Contract | null> {
    const contract = this.state.contracts.find((c) => c.id === id);
    return contract ? clone(contract) : null;
  }

  async saveContract(contract: Contract): Promise<void> {
    const index = this.state.contracts.findIndex((c) => c.id === contract.id);
    if (index === -1) this.state.contracts.push(clone(contract));
    else this.state.contracts[index] = clone(contract);
  }

  async deleteContract(id: string): Promise<void> {
    this.state.contracts = this.state.contracts.filter((c) => c.id !== id);
  }

  async getStatsSince(): Promise<string | null> {
    return this.state.statsSince ?? null;
  }

  async setStatsSince(at: string): Promise<void> {
    this.state.statsSince = at;
  }

  private get messages(): Message[] {
    return (this.state.messages ??= []);
  }

  private get files() {
    return (this.state.files ??= new Map());
  }

  async listMessages(limit: number): Promise<Message[]> {
    return [...this.messages].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit).map(clone);
  }

  async getMessage(id: string): Promise<Message | null> {
    const message = this.messages.find((m) => m.id === id);
    return message ? clone(message) : null;
  }

  async addMessage(message: Message): Promise<void> {
    this.messages.push(clone(message));
  }

  async deleteMessage(id: string): Promise<void> {
    this.state.messages = this.messages.filter((m) => m.id !== id);
    for (const stored of this.files.values()) if (stored.file.messageId === id) stored.file = { ...stored.file, messageId: null };
  }

  async storeFile({ blob, ...meta }: NewFile): Promise<StoredFile> {
    const file: StoredFile = { ...meta, id: crypto.randomUUID(), messageId: null };
    this.files.set(file.id, { file, bytes: new Uint8Array(await blob.arrayBuffer()) });
    return clone(file);
  }

  async getFile(id: string): Promise<StoredFile | null> {
    const stored = this.files.get(id);
    return stored ? clone(stored.file) : null;
  }

  async readFile(id: string): Promise<Uint8Array | null> {
    return this.files.get(id)?.bytes ?? null;
  }

  async listPendingFiles(uploaderId: string): Promise<StoredFile[]> {
    return [...this.files.values()].filter(({ file }) => file.uploaderId === uploaderId && !file.messageId).map(({ file }) => clone(file));
  }

  async linkFiles(ids: string[], messageId: string, uploaderId: string): Promise<number> {
    let linked = 0;
    for (const id of ids) {
      const stored = this.files.get(id);
      if (!stored || stored.file.uploaderId !== uploaderId || stored.file.messageId) continue;
      stored.file = { ...stored.file, messageId };
      linked += 1;
    }
    return linked;
  }

  async deleteFile(id: string): Promise<void> {
    this.files.delete(id);
  }

  private get leads(): Lead[] {
    return (this.state.leads ??= []);
  }

  async listLeads(doneSince: string): Promise<Lead[]> {
    return this.leads.filter((lead) => lead.status === "open" || (lead.status === "done" && (lead.doneAt ?? "") >= doneSince)).map(clone);
  }

  async getLead(id: string): Promise<Lead | null> {
    const lead = this.leads.find((l) => l.id === id);
    return lead ? clone(lead) : null;
  }

  async addLeads(leads: Lead[]): Promise<void> {
    this.leads.push(...leads.map(clone));
  }

  async claimLead(id: string, memberId: string, at: string, prospectId: string): Promise<boolean> {
    const index = this.leads.findIndex((l) => l.id === id && l.status === "open");
    if (index < 0) return false;
    this.leads[index] = { ...this.leads[index], status: "done", doneBy: memberId, doneAt: at, prospectId };
    return true;
  }

  async reopenLead(id: string): Promise<void> {
    this.state.leads = this.leads.map((l) => (l.id === id ? { ...l, status: "open", doneBy: null, doneAt: null, prospectId: null } : l));
  }

  async deleteLead(id: string): Promise<void> {
    this.state.leads = this.leads.filter((l) => l.id !== id);
  }

  async archiveOpenLeads(): Promise<number> {
    const open = this.leads.filter((l) => l.status === "open").length;
    this.state.leads = this.leads.map((l) => (l.status === "open" ? { ...l, status: "archived" } : l));
    return open;
  }

  async findProspectsByNameKeys(nameKeys: string[]): Promise<Prospect[]> {
    const wanted = new Set(nameKeys);
    return this.state.prospects.filter((p) => wanted.has(nameKey(p.name))).map(clone);
  }

  async storageUsage(): Promise<{ files: number; bytes: number }> {
    const files = [...this.files.values()];
    return { files: files.length, bytes: files.reduce((sum, { file }) => sum + file.size, 0) };
  }

  private get presence(): PresenceDay[] {
    return (this.state.presence ??= []);
  }

  private get logins(): LoginEvent[] {
    return (this.state.logins ??= []);
  }

  async recordPresence(memberId: string, day: IsoDate, at: string): Promise<void> {
    const entry = this.presence.find((p) => p.memberId === memberId && p.day === day);
    if (entry) entry.lastSeenAt = at > entry.lastSeenAt ? at : entry.lastSeenAt;
    else this.presence.push({ memberId, day, firstSeenAt: at, lastSeenAt: at });
    const stored = this.state.members.find((s) => s.member.id === memberId);
    if (stored && (!stored.member.lastSeenAt || at > stored.member.lastSeenAt)) stored.member = { ...stored.member, lastSeenAt: at };
  }

  async listPresence(range: DateRange): Promise<PresenceDay[]> {
    return this.presence.filter((p) => inRange(p.day, range)).map(clone);
  }

  async recordLogin(event: Omit<LoginEvent, "id">): Promise<void> {
    this.logins.push({ ...event, id: crypto.randomUUID() });
  }

  async listLoginEvents(since: string, limit: number): Promise<LoginEvent[]> {
    return this.logins
      .filter((event) => event.at >= since)
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, limit)
      .map(clone);
  }
}

const globalForDemo = globalThis as typeof globalThis & { __demoState?: Promise<DemoState> };

/** État partagé par toutes les requêtes du process (survit au rechargement à chaud). */
export async function getDemoRepository(): Promise<DemoRepository> {
  globalForDemo.__demoState ??= createDemoState(todayIso());
  return new DemoRepository(await globalForDemo.__demoState);
}
