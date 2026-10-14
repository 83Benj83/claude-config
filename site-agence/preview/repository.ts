import { monthKeyOf } from "@/lib/dates";
import { cityKey, nameKey } from "@/lib/establishments";
import { loginKey, type Credentials, type MemberUpdate, type NewFile, type NewMember, type Repository } from "@/lib/data/repository";
import type { Contract, DateRange, LoginEvent, Member, Message, PresenceDay, Prospect, Resource, StoredFile } from "@/lib/types";
import { monthDocId, type PreviewStore, type StoredMember } from "./store";

const toMember = ({ passwordHash, sessionVersion, ...member }: StoredMember): Member => ({ ...member });
const toCredentials = (stored: StoredMember): Credentials => ({
  member: toMember(stored),
  passwordHash: stored.passwordHash,
  sessionVersion: stored.sessionVersion,
});
const inRange = (date: string, range?: DateRange) => !range || (date >= range.from && date <= range.to);

/**
 * Fichiers de l'aperçu : ceux de l'Artifact (capacité `assets`), ou un
 * stockage en mémoire pour les tests locaux. `null` : envoi indisponible.
 */
export type PreviewFiles = {
  upload(blob: Blob, type: string): Promise<string>;
  remove(id: string): Promise<void>;
  url(id: string): string;
};

/** Erreur lisible quand l'aperçu ne peut pas stocker de fichiers pour cette personne. */
export class FilesUnavailableError extends Error {
  readonly code = "files_unavailable";
}

/** Le contrat de données du site, servi par la base partagée de l'aperçu. */
export class PreviewRepository implements Repository {
  /** Fichiers envoyés dans cette page et pas encore publiés avec un message. */
  private pending = new Map<string, StoredFile>();

  constructor(
    private readonly store: PreviewStore,
    private readonly files: PreviewFiles | null = null,
  ) {}

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
    const created: StoredMember = { ...member, id: crypto.randomUUID(), welcomedAt: null, lastLoginAt: null, lastSeenAt: null, passwordHash, sessionVersion: 1 };
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
    await this.addProspects([prospect]);
  }

  /** Regroupés par membre et par mois : un document écrit par mois concerné. */
  async addProspects(prospects: Prospect[]): Promise<void> {
    const byDoc = new Map<string, Prospect[]>();
    for (const prospect of prospects) {
      const id = monthDocId(prospect.memberId, monthKeyOf(prospect.date));
      byDoc.set(id, [...(byDoc.get(id) ?? []), prospect]);
    }
    for (const [id, added] of byDoc) {
      const current = this.store.months.get(id);
      const { memberId, date } = added[0];
      await this.store.putMonth(id, { memberId, month: monthKeyOf(date), items: [...(current?.items ?? []), ...added] });
    }
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

  async listContracts(): Promise<Contract[]> {
    return [...this.store.contracts.values()];
  }

  async getContract(id: string): Promise<Contract | null> {
    return this.store.contracts.get(id) ?? null;
  }

  async saveContract(contract: Contract): Promise<void> {
    await this.store.putContract(contract);
  }

  async deleteContract(id: string): Promise<void> {
    await this.store.removeContract(id);
  }

  async getStatsSince(): Promise<string | null> {
    return this.store.statsSince;
  }

  async setStatsSince(at: string): Promise<void> {
    await this.store.putStatsSince(at);
  }

  async listMessages(limit: number): Promise<Message[]> {
    return [...this.store.messages.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }

  async getMessage(id: string): Promise<Message | null> {
    return this.store.messages.get(id) ?? null;
  }

  async addMessage(message: Message): Promise<void> {
    await this.store.putMessage(message);
  }

  async deleteMessage(id: string): Promise<void> {
    await this.store.removeMessage(id);
  }

  async storeFile({ blob, ...meta }: NewFile): Promise<StoredFile> {
    if (!this.files) throw new FilesUnavailableError("Envoi de fichiers indisponible");
    const id = await this.files.upload(blob, meta.type);
    const file: StoredFile = { ...meta, id, messageId: null };
    this.pending.set(id, file);
    return file;
  }

  /** Un fichier publié est connu par son message ; un fichier en attente, par cette page. */
  async getFile(id: string): Promise<StoredFile | null> {
    const pending = this.pending.get(id);
    if (pending) return pending;
    for (const message of this.store.messages.values()) {
      const attachment = message.attachments.find((item) => item.id === id);
      if (attachment) return { ...attachment, uploaderId: message.authorId, messageId: message.id, createdAt: message.createdAt };
    }
    return null;
  }

  async readFile(): Promise<Uint8Array | null> {
    // Les fichiers de l'aperçu sont servis directement par l'Artifact.
    return null;
  }

  async listPendingFiles(uploaderId: string): Promise<StoredFile[]> {
    return [...this.pending.values()].filter((file) => file.uploaderId === uploaderId);
  }

  async linkFiles(ids: string[], _messageId: string, uploaderId: string): Promise<number> {
    let linked = 0;
    for (const id of ids) {
      if (this.pending.get(id)?.uploaderId !== uploaderId) continue;
      this.pending.delete(id);
      linked += 1;
    }
    return linked;
  }

  async deleteFile(id: string): Promise<void> {
    this.pending.delete(id);
    await this.files?.remove(id);
  }

  async storageUsage(): Promise<{ files: number; bytes: number }> {
    const attachments = [...this.store.messages.values()].flatMap((message) => message.attachments);
    return { files: attachments.length, bytes: attachments.reduce((sum, file) => sum + file.size, 0) };
  }

  // L'aperçu ne suit ni les visites ni les connexions : la rubrique Activité y reste vide.
  async recordPresence(): Promise<void> {}

  async listPresence(): Promise<PresenceDay[]> {
    return [];
  }

  async recordLogin(): Promise<void> {}

  async listLoginEvents(): Promise<LoginEvent[]> {
    return [];
  }
}
