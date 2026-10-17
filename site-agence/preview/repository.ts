import { monthKeyOf } from "@/lib/dates";
import { cityKey, nameKey } from "@/lib/establishments";
import { loginKey, type Credentials, type MemberUpdate, type NewFile, type NewMember, type Repository } from "@/lib/data/repository";
import type { Callback, Contract, DateRange, Entry, Lead, LeadBatch, LeadOutcome, LoginEvent, Member, Message, Mockup, PresenceDay, Prospect, Resource, StoredFile } from "@/lib/types";
import { countedSince, entriesFromProspects } from "@/lib/views";
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

  async listEntries(range: DateRange, since: string | null): Promise<Entry[]> {
    return entriesFromProspects(countedSince(await this.listProspects(range), since));
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

  async listMessages(limit: number, channel?: string): Promise<Message[]> {
    return [...this.store.messages.values()]
      .filter((message) => !channel || message.channel === channel)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async updateMessage(id: string, patch: Partial<Pick<Message, "pinned" | "reactions">>): Promise<void> {
    const message = this.store.messages.get(id);
    if (message) await this.store.putMessage({ ...message, ...patch });
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

  /* ----------------------------- Maquettes ----------------------------- */

  async listMockups(): Promise<Mockup[]> {
    return [...this.store.mockups.values()];
  }

  async getMockup(id: string): Promise<Mockup | null> {
    return this.store.mockups.get(id) ?? null;
  }

  async saveMockup(mockup: Mockup): Promise<void> {
    await this.store.putDoc("mockups", mockup);
  }

  async deleteMockup(id: string): Promise<void> {
    await this.store.removeDoc("mockups", id);
  }

  /* ---------------------- Liste « À contacter » ------------------------ */

  private get leads(): Lead[] {
    return [...this.store.leads.values()];
  }

  private async patchLead(id: string, patch: Partial<Lead>): Promise<void> {
    const lead = this.store.leads.get(id);
    if (lead) await this.store.putDoc("leads", { ...lead, ...patch });
  }

  async listLeads(doneSince: string): Promise<Lead[]> {
    return this.leads.filter((lead) => lead.status === "open" || (lead.status === "done" && (lead.doneAt ?? "") >= doneSince));
  }

  async getLead(id: string): Promise<Lead | null> {
    return this.store.leads.get(id) ?? null;
  }

  async addLeads(leads: Lead[]): Promise<void> {
    await Promise.all(leads.map((lead) => this.store.putDoc("leads", lead)));
  }

  async claimLead(id: string, memberId: string, at: string, prospectId: string): Promise<boolean> {
    const lead = this.store.leads.get(id);
    if (!lead || lead.status !== "open" || lead.batchId) return false;
    await this.store.putDoc("leads", { ...lead, status: "done", doneBy: memberId, doneAt: at, prospectId });
    return true;
  }

  async reopenLead(id: string): Promise<void> {
    await this.patchLead(id, { status: "open", doneBy: null, doneAt: null, prospectId: null, outcome: null, batchId: null });
  }

  async deleteLead(id: string): Promise<void> {
    await this.store.removeDoc("leads", id);
  }

  async archiveOpenLeads(): Promise<number> {
    const open = this.leads.filter((lead) => lead.status === "open");
    await Promise.all(open.map((lead) => this.store.putDoc("leads", { ...lead, status: "archived" })));
    return open.length;
  }

  async deferLead(id: string, memberId: string, at: string): Promise<boolean> {
    const lead = this.store.leads.get(id);
    if (!lead || lead.status !== "open" || lead.batchId) return false;
    await this.store.putDoc("leads", { ...lead, status: "done", doneBy: memberId, doneAt: at, outcome: "callback" });
    return true;
  }

  async setLeadOutcome(id: string, outcome: LeadOutcome | null): Promise<void> {
    const lead = this.store.leads.get(id);
    if (lead && lead.status === "open" && lead.batchId) await this.store.putDoc("leads", { ...lead, outcome });
  }

  async listActiveBatches(): Promise<LeadBatch[]> {
    return [...this.store.batches.values()].filter((batch) => !batch.finishedAt);
  }

  async createBatch(batch: LeadBatch, size: number): Promise<{ batch: LeadBatch; leads: Lead[] } | null> {
    if ((await this.listActiveBatches()).some((other) => other.memberId === batch.memberId)) return null;
    await this.store.putDoc("batches", batch);
    const free = this.leads
      .filter((lead) => lead.status === "open" && !lead.batchId)
      .sort((a, b) => a.listDay.localeCompare(b.listDay) || a.createdAt.localeCompare(b.createdAt));
    const chosen = [...free.filter((lead) => lead.phone), ...free.filter((lead) => !lead.phone)].slice(0, size);
    const leads = chosen.map((lead) => ({ ...lead, batchId: batch.id }));
    await Promise.all(leads.map((lead) => this.store.putDoc("leads", lead)));
    return { batch, leads };
  }

  async listBatchLeads(batchId: string): Promise<Lead[]> {
    return this.leads.filter((lead) => lead.batchId === batchId);
  }

  async linkLeadProspects(links: { leadId: string; prospectId: string }[]): Promise<void> {
    await Promise.all(
      links.map(({ leadId, prospectId }) => {
        const lead = this.store.leads.get(leadId);
        return lead && lead.status === "open" && lead.batchId ? this.store.putDoc("leads", { ...lead, prospectId }) : undefined;
      }),
    );
  }

  async finishBatch(batchId: string, memberId: string, at: string, items: { leadId: string; prospect: Prospect }[]): Promise<boolean> {
    const batch = this.store.batches.get(batchId);
    if (!batch || batch.finishedAt) return false;
    await this.store.putDoc("batches", { ...batch, finishedAt: at });
    await this.addProspects(items.map((item) => item.prospect));
    const byLead = new Map(items.map((item) => [item.leadId, item.prospect.id]));
    await Promise.all(
      this.leads
        .filter((lead) => lead.batchId === batchId && lead.status === "open")
        .map((lead) => this.store.putDoc("leads", { ...lead, status: "done", doneBy: memberId, doneAt: at, prospectId: byLead.get(lead.id) ?? lead.prospectId })),
    );
    return true;
  }

  async releaseBatch(batchId: string): Promise<number> {
    const back = this.leads.filter((lead) => lead.batchId === batchId && lead.status === "open");
    await Promise.all(back.map((lead) => this.store.putDoc("leads", { ...lead, batchId: null, outcome: null, prospectId: null })));
    await this.store.removeDoc("batches", batchId);
    return back.length;
  }

  /* ------------------------------ Rappels ------------------------------ */

  async listCallbacks(doneSince: string): Promise<Callback[]> {
    return [...this.store.callbacks.values()].filter((callback) => callback.status === "pending" || (callback.doneAt ?? "") >= doneSince);
  }

  async getCallback(id: string): Promise<Callback | null> {
    return this.store.callbacks.get(id) ?? null;
  }

  async saveCallback(callback: Callback): Promise<void> {
    await this.store.putDoc("callbacks", callback);
  }

  async completeCallback(id: string, memberId: string, at: string): Promise<boolean> {
    const callback = this.store.callbacks.get(id);
    if (!callback || callback.status !== "pending") return false;
    await this.store.putDoc("callbacks", { ...callback, status: "done", doneBy: memberId, doneAt: at });
    return true;
  }

  async reopenCallback(id: string): Promise<void> {
    const callback = this.store.callbacks.get(id);
    if (callback) await this.store.putDoc("callbacks", { ...callback, status: "pending", doneBy: null, doneAt: null });
  }

  async deleteCallback(id: string): Promise<void> {
    await this.store.removeDoc("callbacks", id);
  }

  async findProspectsByNameKeys(nameKeys: string[]): Promise<Prospect[]> {
    const wanted = new Set(nameKeys);
    return (await this.listProspects()).filter((prospect) => wanted.has(nameKey(prospect.name)));
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
