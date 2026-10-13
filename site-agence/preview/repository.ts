import { monthKeyOf } from "@/lib/dates";
import { cityKey, nameKey } from "@/lib/establishments";
import { loginKey, type Credentials, type MemberUpdate, type NewMember, type Repository } from "@/lib/data/repository";
import type { DateRange, Member, Prospect, Resource } from "@/lib/types";
import { monthDocId, type PreviewStore, type StoredMember } from "./store";

const toMember = ({ passwordHash, sessionVersion, ...member }: StoredMember): Member => ({ ...member });
const toCredentials = (stored: StoredMember): Credentials => ({
  member: toMember(stored),
  passwordHash: stored.passwordHash,
  sessionVersion: stored.sessionVersion,
});
const inRange = (date: string, range?: DateRange) => !range || (date >= range.from && date <= range.to);

/** Le contrat de données du site, servi par la base partagée de l'aperçu. */
export class PreviewRepository implements Repository {
  constructor(private readonly store: PreviewStore) {}

  async listMembers(): Promise<Member[]> {
    return [...this.store.members.values()].map(toMember);
  }

  async getCredentialsById(id: string): Promise<Credentials | null> {
    const stored = this.store.members.get(id);
    return stored ? toCredentials(stored) : null;
  }

  async getCredentialsByLogin(login: string): Promise<Credentials | null> {
    const key = loginKey(login);
    const stored = [...this.store.members.values()].find((member) => loginKey(member.login) === key);
    return stored ? toCredentials(stored) : null;
  }

  async createMember({ passwordHash, ...member }: NewMember): Promise<Member> {
    const created: StoredMember = { ...member, id: crypto.randomUUID(), welcomedAt: null, lastLoginAt: null, passwordHash, sessionVersion: 1 };
    await this.store.putMember(created);
    return toMember(created);
  }

  async updateMember(id: string, { passwordHash, revokeSessions, ...patch }: MemberUpdate): Promise<void> {
    const stored = this.store.members.get(id);
    if (!stored) return;
    await this.store.putMember({
      ...stored,
      ...patch,
      passwordHash: passwordHash ?? stored.passwordHash,
      sessionVersion: stored.sessionVersion + (revokeSessions ? 1 : 0),
    });
  }

  async listProspects(range?: DateRange): Promise<Prospect[]> {
    return this.store.allProspects().filter((prospect) => inRange(prospect.date, range));
  }

  async listRecentProspects(limit: number): Promise<Prospect[]> {
    return this.store
      .allProspects()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async findProspectsByNameToken(token: string): Promise<Prospect[]> {
    return this.store.allProspects().filter((prospect) => nameKey(prospect.name).includes(token));
  }

  async countEstablishments(): Promise<number> {
    return new Set(this.store.allProspects().map((prospect) => `${nameKey(prospect.name)}|${cityKey(prospect.city)}`)).size;
  }

  async getProspect(id: string): Promise<Prospect | null> {
    return this.store.allProspects().find((prospect) => prospect.id === id) ?? null;
  }

  async addProspect(prospect: Prospect): Promise<void> {
    const month = monthKeyOf(prospect.date);
    const id = monthDocId(prospect.memberId, month);
    const current = this.store.months.get(id);
    await this.store.putMonth(id, { memberId: prospect.memberId, month, items: [...(current?.items ?? []), prospect] });
  }

  async deleteProspect(id: string): Promise<void> {
    for (const [docId, month] of this.store.months) {
      if (month.items.some((item) => item.id === id)) {
        await this.store.putMonth(docId, { ...month, items: month.items.filter((item) => item.id !== id) });
        return;
      }
    }
  }

  async listResources(): Promise<Resource[]> {
    return [...this.store.resources.values()];
  }

  async saveResource(resource: Resource): Promise<void> {
    await this.store.putResource(resource);
  }

  async deleteResource(id: string): Promise<void> {
    await this.store.removeResource(id);
  }
}
