/**
 * Données de l'aperçu interactif : copie locale, tenue à jour en direct, des
 * collections de la base partagée de l'Artifact.
 *
 * - `members/<id>`      : un document par identifiant (nom, poste, rôles…) ;
 * - `credentials/<id>`  : empreinte du mot de passe et version de session. Une règle
 *   d'accès la réserve aux personnes autorisées à modifier l'aperçu : avec un simple
 *   lien de consultation, on voit les noms mais on ne peut ni lire les empreintes,
 *   ni se connecter ;
 * - `prospects/<membre>_<mois>` : les prospects d'un membre pour un mois ;
 * - `resources/<id>`    : adresses e-mail, modèles et liens ;
 * - `settings/app`      : réglages (date de remise à zéro des statistiques) ;
 * - `contracts/<id>`    : contrats en cours et effectués ;
 * - `messages/<id>`     : messages de l'échange (les fichiers joints sont des
 *   fichiers de l'Artifact, désignés par leur identifiant) ;
 * - `leads/<id>`        : commerces de la liste « À contacter » ;
 * - `batches/<id>`      : fichiers de 10 à 50 commerces extraits par un membre ;
 * - `callbacks/<id>`    : rappels de l'équipe ;
 * - `mockups/<id>`      : maquettes en cours et terminées.
 *
 * Tout ce qui vient de la base est relu et filtré : un document mal formé
 * est ignoré plutôt que d'interrompre l'affichage.
 */
import { isChannel } from "@/lib/channels";
import { isIsoDate } from "@/lib/dates";
import { FILE_TYPES } from "@/lib/attachments";
import { ATTACHMENT_MAX_BYTES, MESSAGE_MAX_FILES, MESSAGE_MAX_LENGTH, MESSAGES_SHOWN } from "@/lib/rules";
import type {
  Attachment,
  Callback,
  CallbackPriority,
  Contract,
  ContractPack,
  ContractStatus,
  Lead,
  LeadBatch,
  Member,
  Message,
  Mockup,
  Prospect,
  Resource,
  ResourceKind,
} from "@/lib/types";

export type DbError = { code: string; message: string };
type DocSnapshot = { id: string; exists: boolean; data(): Record<string, unknown> | undefined };
type QuerySnapshot = { docs: DocSnapshot[] };
type DocRef = {
  set(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
};
type Query = {
  orderBy(field: string, dir?: "asc" | "desc"): Query;
  limit(n: number): Query;
  onSnapshot(next: (snap: QuerySnapshot) => void, error?: (e: DbError) => void): () => void;
};
type Collection = Query & { doc(id: string): DocRef };
/** Sous-ensemble de la capacité `db` utilisé ici. */
export type Db = { collection(path: string): Collection };

export type StoredMember = Member & { passwordHash: string | null; sessionVersion: number };
type MonthDoc = { memberId: string; month: string; items: Prospect[] };

const RESOURCE_KINDS: ResourceKind[] = ["email", "phone", "template", "link"];
/** Plus d'un millier de mois-membres : bien au-delà de l'usage d'un aperçu. */
const MONTH_DOCS_LIMIT = 1000;

const text = (value: unknown, max = 5000): string | null => (typeof value === "string" && value.length <= max ? value : null);
const optionalText = (value: unknown, max = 5000) => text(value, max) ?? null;
/** Horodatage lisible, remis au format ISO (sinon ignoré). */
function isoTimestamp(value: unknown): string | null {
  const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

type Secret = { passwordHash: string | null; sessionVersion: number };

function readSecret(data: Record<string, unknown>): Secret {
  return {
    passwordHash: optionalText(data.passwordHash, 300),
    sessionVersion: typeof data.sessionVersion === "number" ? data.sessionVersion : 1,
  };
}

function readMember(id: string, data: Record<string, unknown>): Member | null {
  const login = text(data.login, 80);
  const fullName = text(data.fullName, 120);
  if (!login || !fullName) return null;
  const avatarUrl = text(data.avatarUrl, 500);
  return {
    id,
    login,
    fullName,
    jobTitle: text(data.jobTitle, 120) ?? "",
    department: optionalText(data.department, 80),
    managerId: optionalText(data.managerId, 80),
    // Seules les images https sont affichées.
    avatarUrl: avatarUrl && /^https:\/\//.test(avatarUrl) ? avatarUrl : null,
    isProspector: data.isProspector === true,
    isAdmin: data.isAdmin === true,
    active: data.active !== false,
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
    welcomedAt: optionalText(data.welcomedAt, 40),
    lastLoginAt: optionalText(data.lastLoginAt, 40),
    lastSeenAt: optionalText(data.lastSeenAt, 40),
  };
}

function readProspect(memberId: string, value: unknown): Prospect | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const id = text(item.id, 100);
  const name = text(item.name, 120);
  const city = text(item.city, 80);
  if (!id || !name || !city || !isChannel(item.channel) || !isIsoDate(item.date)) return null;
  return {
    id,
    memberId,
    name,
    city,
    channel: item.channel,
    contact: optionalText(item.contact, 160),
    note: optionalText(item.note, 500),
    date: item.date,
    createdAt: text(item.createdAt, 40) ?? `${item.date}T12:00:00.000Z`,
  };
}

function readMonth(data: Record<string, unknown>): MonthDoc | null {
  const memberId = text(data.memberId, 80);
  const month = text(data.month, 7);
  if (!memberId || !month || !Array.isArray(data.items)) return null;
  const items = data.items.map((item) => readProspect(memberId, item)).filter((item): item is Prospect => item !== null);
  return { memberId, month, items };
}

function readResource(id: string, data: Record<string, unknown>): Resource | null {
  const kind = RESOURCE_KINDS.find((candidate) => candidate === data.kind);
  const title = text(data.title, 100);
  const value = text(data.value, 5000);
  if (!kind || !title || !value) return null;
  // Un lien n'est ouvert que s'il pointe vers une page web.
  if (kind === "link" && !/^https?:\/\/\S+$/.test(value)) return null;
  return { id, kind, title, value, note: optionalText(data.note, 300), sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0 };
}

const PACKS: ContractPack[] = ["Essentiel", "Pro", "Signature", "Sur mesure"];
const STATUSES: ContractStatus[] = ["maquette", "developpement", "validation", "termine"];
const euros = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null);
const isoDate = (value: unknown) => (isIsoDate(value) ? value : null);

function readContract(id: string, data: Record<string, unknown>): Contract | null {
  const client = text(data.client, 120);
  const pack = PACKS.find((candidate) => candidate === data.pack);
  const status = STATUSES.find((candidate) => candidate === data.status);
  const signedOn = isoDate(data.signedOn);
  if (!client || !pack || !status || !signedOn) return null;
  const siteUrl = text(data.siteUrl, 300);
  return {
    id,
    client,
    city: optionalText(data.city, 80),
    contact: optionalText(data.contact, 160),
    pack,
    options: optionalText(data.options, 300),
    amount: euros(data.amount),
    monthly: euros(data.monthly),
    status,
    signedOn,
    deliveredOn: isoDate(data.deliveredOn),
    // Seuls les liens web sont affichés.
    siteUrl: siteUrl && /^https?:\/\/\S+$/.test(siteUrl) ? siteUrl : null,
    broughtBy: optionalText(data.broughtBy, 80),
    note: optionalText(data.note, 500),
    createdAt: text(data.createdAt, 40) ?? `${signedOn}T12:00:00.000Z`,
    updatedAt: text(data.updatedAt, 40) ?? `${signedOn}T12:00:00.000Z`,
  };
}

/** Identifiant de fichier de l'Artifact (32 caractères) ou du stockage local de test. */
const FILE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const KNOWN_TYPES = new Map(FILE_TYPES.map((fileType) => [fileType.type, fileType.kind] as const));

function readAttachment(value: unknown): Attachment | null {
  if (typeof value !== "object" || value === null) return null;
  const data = value as Record<string, unknown>;
  const id = text(data.id, 64);
  const name = text(data.name, 120);
  const type = text(data.type, 120);
  const size = data.size;
  const kind = type ? KNOWN_TYPES.get(type) : undefined;
  if (!id || !FILE_ID.test(id) || !name || !type || !kind) return null;
  if (typeof size !== "number" || !Number.isInteger(size) || size < 1 || size > ATTACHMENT_MAX_BYTES) return null;
  return { id, name, type, size, kind };
}

function readMessage(id: string, data: Record<string, unknown>): Message | null {
  const authorId = text(data.authorId, 64);
  const body = text(data.text, MESSAGE_MAX_LENGTH) ?? "";
  const createdAt = isoTimestamp(data.createdAt);
  const attachments = Array.isArray(data.attachments)
    ? data.attachments.slice(0, MESSAGE_MAX_FILES).flatMap((item) => readAttachment(item) ?? [])
    : [];
  if (!authorId || !createdAt || (!body && attachments.length === 0)) return null;
  const reactions: Record<string, string[]> = {};
  if (typeof data.reactions === "object" && data.reactions !== null) {
    for (const [emoji, who] of Object.entries(data.reactions as Record<string, unknown>)) {
      if (Array.isArray(who)) reactions[emoji] = who.filter((item): item is string => typeof item === "string").slice(0, 200);
    }
  }
  return {
    id,
    authorId,
    text: body,
    attachments,
    createdAt,
    channel: text(data.channel, 40) ?? "general",
    replyTo: text(data.replyTo, 64),
    pinned: data.pinned === true,
    reactions,
  };
}

const httpsUrl = (value: unknown, max = 160) => {
  const url = text(value, max);
  return url && /^https:\/\/\S+$/.test(url) ? url : null;
};
const LEAD_STATUSES = ["open", "done", "archived"] as const;
const PRIORITIES: CallbackPriority[] = ["faible", "moyenne", "haute", "urgente"];

function readLead(id: string, data: Record<string, unknown>): Lead | null {
  const name = text(data.name, 120);
  const city = text(data.city, 80);
  const listDay = isoDate(data.listDay);
  if (!name || !city || !listDay) return null;
  const tips = Array.isArray(data.tips) ? data.tips.flatMap((tip) => text(tip, 160) ?? []).slice(0, 3) : [];
  return {
    id,
    name,
    city,
    category: optionalText(data.category, 60),
    phone: optionalText(data.phone, 30),
    email: optionalText(data.email, 160),
    instagram: httpsUrl(data.instagram),
    facebook: httpsUrl(data.facebook),
    note: optionalText(data.note, 300),
    address: optionalText(data.address, 160),
    tips,
    listDay,
    status: LEAD_STATUSES.find((status) => status === data.status) ?? "open",
    doneBy: optionalText(data.doneBy, 80),
    doneAt: isoTimestamp(data.doneAt),
    prospectId: optionalText(data.prospectId, 100),
    addedBy: optionalText(data.addedBy, 80),
    batchId: optionalText(data.batchId, 100),
    outcome: data.outcome === "contacted" || data.outcome === "callback" ? data.outcome : null,
    createdAt: isoTimestamp(data.createdAt) ?? `${listDay}T06:00:00.000Z`,
  };
}

function readBatch(id: string, data: Record<string, unknown>): LeadBatch | null {
  const memberId = text(data.memberId, 80);
  const createdAt = isoTimestamp(data.createdAt);
  if (!memberId || !createdAt || typeof data.size !== "number") return null;
  return { id, memberId, size: data.size, createdAt, finishedAt: isoTimestamp(data.finishedAt) };
}

function readCallback(id: string, data: Record<string, unknown>): Callback | null {
  const name = text(data.name, 120);
  const dueOn = isoDate(data.dueOn);
  const addedBy = text(data.addedBy, 80);
  const createdAt = isoTimestamp(data.createdAt);
  if (!name || !dueOn || !addedBy || !createdAt) return null;
  const dueTime = text(data.dueTime, 5);
  return {
    id,
    name,
    city: optionalText(data.city, 80),
    phone: optionalText(data.phone, 30),
    contactName: optionalText(data.contactName, 80),
    dueOn,
    dueTime: dueTime && /^\d{2}:\d{2}$/.test(dueTime) ? dueTime : null,
    priority: PRIORITIES.find((priority) => priority === data.priority) ?? "moyenne",
    note: optionalText(data.note, 500),
    addedBy,
    leadId: optionalText(data.leadId, 100),
    status: data.status === "done" ? "done" : "pending",
    doneBy: optionalText(data.doneBy, 80),
    doneAt: isoTimestamp(data.doneAt),
    createdAt,
  };
}

function readMockup(id: string, data: Record<string, unknown>): Mockup | null {
  const client = text(data.client, 120);
  const startedOn = isoDate(data.startedOn);
  if (!client || !startedOn) return null;
  const previewUrl = text(data.previewUrl, 300);
  return {
    id,
    client,
    city: optionalText(data.city, 80),
    contact: optionalText(data.contact, 160),
    status: data.status === "terminee" ? "terminee" : "en_cours",
    startedOn,
    doneOn: isoDate(data.doneOn),
    previewUrl: previewUrl && /^https?:\/\/\S+$/.test(previewUrl) ? previewUrl : null,
    madeBy: optionalText(data.madeBy, 80),
    note: optionalText(data.note, 500),
    createdAt: isoTimestamp(data.createdAt) ?? `${startedOn}T12:00:00.000Z`,
    updatedAt: isoTimestamp(data.updatedAt) ?? `${startedOn}T12:00:00.000Z`,
  };
}

/** Collections d'un document par élément (identifiant = id de l'élément). */
type DocKinds = { leads: Lead; batches: LeadBatch; callbacks: Callback; mockups: Mockup };
const DOC_READERS: { [K in keyof DocKinds]: (id: string, data: Record<string, unknown>) => DocKinds[K] | null } = {
  leads: readLead,
  batches: readBatch,
  callbacks: readCallback,
  mockups: readMockup,
};
/** Collections attendues avant d'afficher l'aperçu. */
const COLLECTIONS = 11;

export const monthDocId = (memberId: string, month: string) => `${memberId}_${month}`;

type Status = "loading" | "ready" | "error";

/**
 * Copie locale des collections. Les écritures passent par ici : elles sont
 * appliquées tout de suite à la copie (affichage immédiat), puis envoyées à
 * la base, une à la fois par document.
 */
export class PreviewStore {
  /** Membres avec leurs informations de connexion (empreinte absente si non lisible). */
  members = new Map<string, StoredMember>();
  months = new Map<string, MonthDoc>();
  resources = new Map<string, Resource>();
  contracts = new Map<string, Contract>();
  /** Derniers messages de l'échange. */
  messages = new Map<string, Message>();
  leads = new Map<string, Lead>();
  batches = new Map<string, LeadBatch>();
  callbacks = new Map<string, Callback>();
  mockups = new Map<string, Mockup>();
  /** Depuis quand les prospects comptent dans les statistiques (`null` : depuis toujours). */
  statsSince: string | null = null;
  status: Status = "loading";
  error: DbError | null = null;

  private publicMembers = new Map<string, Member>();
  private secrets = new Map<string, Secret>();
  private loaded = new Set<string>();
  private listeners = new Set<() => void>();
  private queues = new Map<string, Promise<unknown>>();
  private unsubscribers: (() => void)[] = [];
  private revision = 0;

  constructor(private readonly db: Db) {}

  start() {
    const fail = (error: DbError) => {
      this.status = "error";
      this.error = error;
      this.emit();
    };
    const loadedOne = (name: string) => {
      this.loaded.add(name);
      if (this.loaded.size === COLLECTIONS && this.status === "loading") this.status = "ready";
      this.emit();
    };

    this.unsubscribers.push(
      this.db.collection("members").onSnapshot((snap) => {
        this.publicMembers = new Map(
          snap.docs.flatMap((doc) => {
            const member = doc.exists ? readMember(doc.id, doc.data() ?? {}) : null;
            return member ? [[doc.id, member] as const] : [];
          }),
        );
        this.mergeMembers();
        loadedOne("members");
      }, fail),
      // Invisible (vide) pour qui n'a qu'un accès en lecture : personne ne s'y connecte alors.
      this.db.collection("credentials").onSnapshot((snap) => {
        this.secrets = new Map(snap.docs.filter((doc) => doc.exists).map((doc) => [doc.id, readSecret(doc.data() ?? {})] as const));
        this.mergeMembers();
        loadedOne("credentials");
      }, fail),
      this.db
        .collection("prospects")
        .orderBy("month", "desc")
        .limit(MONTH_DOCS_LIMIT)
        .onSnapshot((snap) => {
          this.months = new Map(
            snap.docs.flatMap((doc) => {
              const month = doc.exists ? readMonth(doc.data() ?? {}) : null;
              return month ? [[doc.id, month] as const] : [];
            }),
          );
          loadedOne("prospects");
        }, fail),
      this.db.collection("contracts").onSnapshot((snap) => {
        this.contracts = new Map(
          snap.docs.flatMap((doc) => {
            const contract = doc.exists ? readContract(doc.id, doc.data() ?? {}) : null;
            return contract ? [[doc.id, contract] as const] : [];
          }),
        );
        loadedOne("contracts");
      }, fail),
      this.db.collection("settings").onSnapshot((snap) => {
        const app = snap.docs.find((doc) => doc.id === "app" && doc.exists)?.data();
        this.statsSince = isoTimestamp(app?.statsSince);
        loadedOne("settings");
      }, fail),
      this.db
        .collection("messages")
        .orderBy("createdAt", "desc")
        .limit(MESSAGES_SHOWN)
        .onSnapshot((snap) => {
          this.messages = new Map(
            snap.docs.flatMap((doc) => {
              const message = doc.exists ? readMessage(doc.id, doc.data() ?? {}) : null;
              return message ? [[doc.id, message] as const] : [];
            }),
          );
          loadedOne("messages");
        }, fail),
      this.db.collection("resources").onSnapshot((snap) => {
        this.resources = new Map(
          snap.docs.flatMap((doc) => {
            const resource = doc.exists ? readResource(doc.id, doc.data() ?? {}) : null;
            return resource ? [[doc.id, resource] as const] : [];
          }),
        );
        loadedOne("resources");
      }, fail),
      ...(Object.keys(DOC_READERS) as (keyof DocKinds)[]).map((kind) =>
        this.db.collection(kind).onSnapshot((snap) => {
          const read = DOC_READERS[kind] as (id: string, data: Record<string, unknown>) => DocKinds[typeof kind] | null;
          const items = new Map(
            snap.docs.flatMap((doc) => {
              const item = doc.exists ? read(doc.id, doc.data() ?? {}) : null;
              return item ? [[doc.id, item] as const] : [];
            }),
          );
          this.setDocs(kind, items);
          loadedOne(kind);
        }, fail),
      ),
    );
  }

  private setDocs<K extends keyof DocKinds>(kind: K, items: Map<string, DocKinds[K]>) {
    (this as unknown as Record<K, Map<string, DocKinds[K]>>)[kind] = items;
  }

  private docs<K extends keyof DocKinds>(kind: K): Map<string, DocKinds[K]> {
    return (this as unknown as Record<K, Map<string, DocKinds[K]>>)[kind];
  }

  /** Enregistre un élément (commerce, fichier, rappel, maquette) : affiché tout de suite, puis envoyé. */
  async putDoc<K extends keyof DocKinds>(kind: K, item: DocKinds[K]): Promise<void> {
    this.setDocs(kind, new Map(this.docs(kind)).set(item.id, item));
    this.emit();
    const { id, ...body } = item;
    await this.enqueue(`${kind}/${id}`, () => this.db.collection(kind).doc(id).set(body as Record<string, unknown>));
  }

  async removeDoc(kind: keyof DocKinds, id: string): Promise<void> {
    const items = new Map(this.docs(kind));
    items.delete(id);
    this.setDocs(kind, items);
    this.emit();
    await this.enqueue(`${kind}/${id}`, () => this.db.collection(kind).doc(id).delete());
  }

  stop() {
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers = [];
  }

  /* Abonnement pour React (useSyncExternalStore). */
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getRevision = () => this.revision;

  private emit() {
    this.revision += 1;
    for (const listener of this.listeners) listener();
  }

  /** Faux quand cette personne ne voit pas les empreintes : l'aperçu est en lecture seule pour elle. */
  get canSignIn(): boolean {
    return this.secrets.size > 0;
  }

  private mergeMembers() {
    this.members = new Map(
      [...this.publicMembers].map(([id, member]) => [id, { ...member, ...(this.secrets.get(id) ?? { passwordHash: null, sessionVersion: 1 }) }] as const),
    );
  }

  allProspects(): Prospect[] {
    return [...this.months.values()].flatMap((month) => month.items);
  }

  /* ---------------------------- Écritures ---------------------------- */

  /** Une écriture à la fois par document, dans l'ordre des demandes. */
  private enqueue(key: string, write: () => Promise<void>): Promise<void> {
    const previous = this.queues.get(key) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(write);
    this.queues.set(key, next);
    return next;
  }

  async putMember({ passwordHash, sessionVersion, ...member }: StoredMember): Promise<void> {
    const { id, ...body } = member;
    const previous = this.secrets.get(id);
    const secretChanged = !previous || previous.passwordHash !== passwordHash || previous.sessionVersion !== sessionVersion;
    this.publicMembers = new Map(this.publicMembers).set(id, member);
    if (secretChanged) this.secrets = new Map(this.secrets).set(id, { passwordHash, sessionVersion });
    this.mergeMembers();
    this.emit();
    await this.enqueue(`members/${id}`, () => this.db.collection("members").doc(id).set(body));
    if (secretChanged) {
      await this.enqueue(`credentials/${id}`, () => this.db.collection("credentials").doc(id).set({ passwordHash, sessionVersion }));
    }
  }

  async putMonth(id: string, month: MonthDoc): Promise<void> {
    const months = new Map(this.months);
    if (month.items.length === 0) months.delete(id);
    else months.set(id, month);
    this.months = months;
    this.emit();
    const ref = this.db.collection("prospects").doc(id);
    await this.enqueue(`prospects/${id}`, () =>
      month.items.length === 0
        ? ref.delete()
        : ref.set({ memberId: month.memberId, month: month.month, items: month.items.map(({ memberId, ...item }) => item) }),
    );
  }

  async putContract(contract: Contract): Promise<void> {
    this.contracts = new Map(this.contracts).set(contract.id, contract);
    this.emit();
    const { id, ...body } = contract;
    await this.enqueue(`contracts/${id}`, () => this.db.collection("contracts").doc(id).set(body));
  }

  async removeContract(id: string): Promise<void> {
    const contracts = new Map(this.contracts);
    contracts.delete(id);
    this.contracts = contracts;
    this.emit();
    await this.enqueue(`contracts/${id}`, () => this.db.collection("contracts").doc(id).delete());
  }

  async putStatsSince(at: string): Promise<void> {
    this.statsSince = at;
    this.emit();
    await this.enqueue("settings/app", () => this.db.collection("settings").doc("app").set({ statsSince: at }));
  }

  async putMessage(message: Message): Promise<void> {
    this.messages = new Map(this.messages).set(message.id, message);
    this.emit();
    const { id, ...body } = message;
    await this.enqueue(`messages/${id}`, () => this.db.collection("messages").doc(id).set(body));
  }

  async removeMessage(id: string): Promise<void> {
    const messages = new Map(this.messages);
    messages.delete(id);
    this.messages = messages;
    this.emit();
    await this.enqueue(`messages/${id}`, () => this.db.collection("messages").doc(id).delete());
  }

  async putResource(resource: Resource): Promise<void> {
    this.resources = new Map(this.resources).set(resource.id, resource);
    this.emit();
    const { id, ...body } = resource;
    await this.enqueue(`resources/${id}`, () => this.db.collection("resources").doc(id).set(body));
  }

  async removeResource(id: string): Promise<void> {
    const resources = new Map(this.resources);
    resources.delete(id);
    this.resources = resources;
    this.emit();
    await this.enqueue(`resources/${id}`, () => this.db.collection("resources").doc(id).delete());
  }
}
