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
 * - `resources/<id>`    : adresses e-mail, modèles et liens.
 *
 * Tout ce qui vient de la base est relu et filtré : un document mal formé
 * est ignoré plutôt que d'interrompre l'affichage.
 */
import { isChannel } from "@/lib/channels";
import { isIsoDate } from "@/lib/dates";
import type { Member, Prospect, Resource, ResourceKind } from "@/lib/types";

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

const RESOURCE_KINDS: ResourceKind[] = ["email", "template", "link"];
/** Plus d'un millier de mois-membres : bien au-delà de l'usage d'un aperçu. */
const MONTH_DOCS_LIMIT = 1000;

const text = (value: unknown, max = 5000): string | null => (typeof value === "string" && value.length <= max ? value : null);
const optionalText = (value: unknown, max = 5000) => text(value, max) ?? null;

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
      if (this.loaded.size === 4 && this.status === "loading") this.status = "ready";
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
      this.db.collection("resources").onSnapshot((snap) => {
        this.resources = new Map(
          snap.docs.flatMap((doc) => {
            const resource = doc.exists ? readResource(doc.id, doc.data() ?? {}) : null;
            return resource ? [[doc.id, resource] as const] : [];
          }),
        );
        loadedOne("resources");
      }, fail),
    );
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
