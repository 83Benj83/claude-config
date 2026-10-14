import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cityKey, nameKey } from "../establishments";
import { LOGIN_EVENTS_KEPT_DAYS } from "../rules";
import type {
  Attachment,
  AttachmentKind,
  Channel,
  Contract,
  ContractPack,
  ContractStatus,
  DateRange,
  Entry,
  IsoDate,
  LoginEvent,
  Member,
  Message,
  PresenceDay,
  Prospect,
  Resource,
  ResourceKind,
  StoredFile,
} from "../types";
import { loginKey, type Credentials, type MemberUpdate, type NewFile, type NewMember, type Repository } from "./repository";

type MemberRow = {
  id: string;
  login: string;
  full_name: string;
  job_title: string;
  department: string | null;
  manager_id: string | null;
  avatar_url: string | null;
  is_prospector: boolean;
  is_admin: boolean;
  active: boolean;
  sort_order: number;
  welcomed_at: string | null;
  last_login_at: string | null;
  last_seen_at: string | null;
  password_hash: string | null;
  session_version: number;
};

type ProspectRow = {
  id: string;
  member_id: string;
  name: string;
  city: string;
  channel: Channel;
  contact: string | null;
  note: string | null;
  contacted_on: string;
  created_at: string;
};

type ContractRow = {
  id: string;
  client: string;
  city: string | null;
  contact: string | null;
  pack: ContractPack;
  options: string | null;
  amount: number | string | null;
  monthly: number | string | null;
  status: ContractStatus;
  signed_on: string;
  delivered_on: string | null;
  site_url: string | null;
  brought_by: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

type MessageRow = { id: string; author_id: string; body: string; attachments: Attachment[]; created_at: string };

type FileRow = {
  id: string;
  uploader_id: string;
  message_id: string | null;
  name: string;
  type: string;
  size: number;
  kind: AttachmentKind;
  created_at: string;
};

type PresenceRow = { member_id: string; day: IsoDate; first_seen_at: string; last_seen_at: string };
type LoginEventRow = { id: number; member_id: string | null; login: string; ok: boolean; at: string };

const MESSAGE_COLUMNS = "id, author_id, body, attachments, created_at";
const FILE_COLUMNS = "id, uploader_id, message_id, name, type, size, kind, created_at";
/** Espace de stockage privé des fichiers de l'échange (lu par le serveur uniquement). */
const FILES_BUCKET = "echange";

const toMessage = (row: MessageRow): Message => ({
  id: row.id,
  authorId: row.author_id,
  text: row.body,
  attachments: row.attachments ?? [],
  createdAt: row.created_at,
});

const toStoredFile = (row: FileRow): StoredFile => ({
  id: row.id,
  uploaderId: row.uploader_id,
  messageId: row.message_id,
  name: row.name,
  type: row.type,
  size: row.size,
  kind: row.kind,
  createdAt: row.created_at,
});

const toProspectRow = (prospect: Prospect) => ({
  id: prospect.id,
  member_id: prospect.memberId,
  name: prospect.name,
  name_key: nameKey(prospect.name),
  city: prospect.city,
  city_key: cityKey(prospect.city),
  channel: prospect.channel,
  contact: prospect.contact,
  note: prospect.note,
  contacted_on: prospect.date,
  created_at: prospect.createdAt,
});

const CONTRACT_COLUMNS =
  "id, client, city, contact, pack, options, amount, monthly, status, signed_on, delivered_on, site_url, brought_by, note, created_at, updated_at";

/** Les colonnes `numeric` arrivent parfois en texte : conversion explicite. */
const euros = (value: number | string | null) => (value === null ? null : Number(value));

const toContract = (row: ContractRow): Contract => ({
  id: row.id,
  client: row.client,
  city: row.city,
  contact: row.contact,
  pack: row.pack,
  options: row.options,
  amount: euros(row.amount),
  monthly: euros(row.monthly),
  status: row.status,
  signedOn: row.signed_on,
  deliveredOn: row.delivered_on,
  siteUrl: row.site_url,
  broughtBy: row.brought_by,
  note: row.note,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

type ResourceRow = {
  id: string;
  kind: ResourceKind;
  title: string;
  value: string;
  note: string | null;
  sort_order: number;
};

const MEMBER_PUBLIC_COLUMNS =
  "id, login, full_name, job_title, department, manager_id, avatar_url, is_prospector, is_admin, active, sort_order, welcomed_at, last_login_at, last_seen_at";
const MEMBER_CREDENTIAL_COLUMNS = `${MEMBER_PUBLIC_COLUMNS}, password_hash, session_version`;
const PROSPECT_COLUMNS = "id, member_id, name, city, channel, contact, note, contacted_on, created_at";

/** Taille de page pour contourner la limite de 1000 lignes de PostgREST. */
const PAGE_SIZE = 1000;
/** Plafond de candidats pour une recherche par nom. */
const SEARCH_CAP = 3000;

const toMember = (row: Omit<MemberRow, "password_hash" | "session_version">): Member => ({
  id: row.id,
  login: row.login,
  fullName: row.full_name,
  jobTitle: row.job_title,
  department: row.department,
  managerId: row.manager_id,
  avatarUrl: row.avatar_url,
  isProspector: row.is_prospector,
  isAdmin: row.is_admin,
  active: row.active,
  sortOrder: row.sort_order,
  welcomedAt: row.welcomed_at,
  lastLoginAt: row.last_login_at,
  lastSeenAt: row.last_seen_at,
});

const toCredentials = (row: MemberRow): Credentials => ({
  member: toMember(row),
  passwordHash: row.password_hash,
  sessionVersion: row.session_version,
});

const toProspect = (row: ProspectRow): Prospect => ({
  id: row.id,
  memberId: row.member_id,
  name: row.name,
  city: row.city,
  channel: row.channel,
  contact: row.contact,
  note: row.note,
  date: row.contacted_on,
  createdAt: row.created_at,
});

const toResource = (row: ResourceRow): Resource => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  value: row.value,
  note: row.note,
  sortOrder: row.sort_order,
});

export class DataAccessError extends Error {
  constructor(operation: string, cause: { message: string }) {
    super(`Supabase : échec de ${operation} (${cause.message})`);
    this.name = "DataAccessError";
  }
}

function check<T>(operation: string, result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new DataAccessError(operation, result.error);
  return result.data;
}

/** Accès serveur uniquement (clé secrète) ; les autorisations sont vérifiées par les Server Actions. */
export class SupabaseRepository implements Repository {
  constructor(private readonly db: SupabaseClient) {}

  async listMembers(): Promise<Member[]> {
    const rows = check(
      "la lecture des membres",
      await this.db.from("members").select(MEMBER_PUBLIC_COLUMNS).order("sort_order").order("full_name"),
    );
    return (rows as MemberRow[]).map(toMember);
  }

  async getCredentialsById(id: string): Promise<Credentials | null> {
    const row = check("la lecture du membre", await this.db.from("members").select(MEMBER_CREDENTIAL_COLUMNS).eq("id", id).maybeSingle());
    return row ? toCredentials(row as MemberRow) : null;
  }

  async getCredentialsByLogin(login: string): Promise<Credentials | null> {
    const row = check(
      "la lecture de l'identifiant",
      await this.db.from("members").select(MEMBER_CREDENTIAL_COLUMNS).eq("login_key", loginKey(login)).maybeSingle(),
    );
    return row ? toCredentials(row as MemberRow) : null;
  }

  async createMember({ passwordHash, ...member }: NewMember): Promise<Member> {
    const row = check(
      "la création de l'identifiant",
      await this.db
        .from("members")
        .insert({
          login: member.login,
          login_key: loginKey(member.login),
          full_name: member.fullName,
          job_title: member.jobTitle,
          department: member.department,
          manager_id: member.managerId,
          avatar_url: member.avatarUrl,
          is_prospector: member.isProspector,
          is_admin: member.isAdmin,
          active: member.active,
          sort_order: member.sortOrder,
          password_hash: passwordHash,
        })
        .select(MEMBER_PUBLIC_COLUMNS)
        .single(),
    );
    return toMember(row as MemberRow);
  }

  async updateMember(id: string, { passwordHash, revokeSessions, ...patch }: MemberUpdate): Promise<void> {
    const row: Record<string, unknown> = {};
    if (patch.login !== undefined) {
      row.login = patch.login;
      row.login_key = loginKey(patch.login);
    }
    if (patch.fullName !== undefined) row.full_name = patch.fullName;
    if (patch.jobTitle !== undefined) row.job_title = patch.jobTitle;
    if (patch.department !== undefined) row.department = patch.department;
    if (patch.managerId !== undefined) row.manager_id = patch.managerId;
    if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
    if (patch.isProspector !== undefined) row.is_prospector = patch.isProspector;
    if (patch.isAdmin !== undefined) row.is_admin = patch.isAdmin;
    if (patch.active !== undefined) row.active = patch.active;
    if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
    if (patch.welcomedAt !== undefined) row.welcomed_at = patch.welcomedAt;
    if (patch.lastLoginAt !== undefined) row.last_login_at = patch.lastLoginAt;
    if (passwordHash) row.password_hash = passwordHash;

    if (revokeSessions) {
      const current = await this.getCredentialsById(id);
      if (current) row.session_version = current.sessionVersion + 1;
    }
    if (Object.keys(row).length === 0) return;
    check("la mise à jour du membre", await this.db.from("members").update(row).eq("id", id));
  }

  async listProspects(range?: DateRange): Promise<Prospect[]> {
    const prospects: Prospect[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      let query = this.db.from("prospects").select(PROSPECT_COLUMNS);
      if (range) query = query.gte("contacted_on", range.from).lte("contacted_on", range.to);
      const rows = check(
        "la lecture des prospects",
        await query.order("contacted_on").order("id").range(offset, offset + PAGE_SIZE - 1),
      ) as ProspectRow[];
      prospects.push(...rows.map(toProspect));
      if (rows.length < PAGE_SIZE) return prospects;
    }
  }

  async listEntries(range: DateRange, since: string | null): Promise<Entry[]> {
    // Comptés dans la base (fonction SQL) : quelques lignes par membre et par jour, au lieu de chaque prospect.
    const entries: Entry[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const rows = check(
        "la lecture du classement",
        await this.db
          .rpc("prospect_entries", { p_from: range.from, p_to: range.to, p_since: since })
          .order("member_id")
          .order("day")
          .range(offset, offset + PAGE_SIZE - 1),
      ) as { member_id: string; day: IsoDate; count: number }[];
      entries.push(...rows.map((row) => ({ memberId: row.member_id, date: row.day, count: row.count })));
      if (rows.length < PAGE_SIZE) return entries;
    }
  }

  async listRecentProspects(limit: number): Promise<Prospect[]> {
    const rows = check(
      "la lecture des derniers prospects",
      await this.db.from("prospects").select(PROSPECT_COLUMNS).order("created_at", { ascending: false }).limit(limit),
    );
    return (rows as ProspectRow[]).map(toProspect);
  }

  async findProspectsByNameToken(token: string): Promise<Prospect[]> {
    const safe = token.replace(/[^a-z0-9 ]/g, "");
    if (!safe) return [];
    const rows = check(
      "la recherche d'établissements",
      await this.db
        .from("prospects")
        .select(PROSPECT_COLUMNS)
        .ilike("name_key", `%${safe}%`)
        .order("created_at", { ascending: false })
        .limit(SEARCH_CAP),
    );
    return (rows as ProspectRow[]).map(toProspect);
  }

  async countEstablishments(): Promise<number> {
    const row = check("le comptage des établissements", await this.db.from("establishment_count").select("total").single());
    return (row as { total: number }).total;
  }

  async getProspect(id: string): Promise<Prospect | null> {
    const row = check("la lecture du prospect", await this.db.from("prospects").select(PROSPECT_COLUMNS).eq("id", id).maybeSingle());
    return row ? toProspect(row as ProspectRow) : null;
  }

  async addProspect(prospect: Prospect): Promise<void> {
    check("l'enregistrement du prospect", await this.db.from("prospects").insert(toProspectRow(prospect)));
  }

  async addProspects(prospects: Prospect[]): Promise<void> {
    // Une seule requête par paquet : tout ou rien pour chaque paquet de 500.
    for (let offset = 0; offset < prospects.length; offset += 500) {
      check("l'import des prospects", await this.db.from("prospects").insert(prospects.slice(offset, offset + 500).map(toProspectRow)));
    }
  }

  async deleteProspect(id: string): Promise<void> {
    check("la suppression du prospect", await this.db.from("prospects").delete().eq("id", id));
  }

  async listContracts(): Promise<Contract[]> {
    const rows = check("la lecture des contrats", await this.db.from("contracts").select(CONTRACT_COLUMNS).order("signed_on", { ascending: false }));
    return (rows as ContractRow[]).map(toContract);
  }

  async getContract(id: string): Promise<Contract | null> {
    const row = check("la lecture du contrat", await this.db.from("contracts").select(CONTRACT_COLUMNS).eq("id", id).maybeSingle());
    return row ? toContract(row as ContractRow) : null;
  }

  async saveContract(contract: Contract): Promise<void> {
    check(
      "l'enregistrement du contrat",
      await this.db.from("contracts").upsert({
        id: contract.id,
        client: contract.client,
        city: contract.city,
        contact: contract.contact,
        pack: contract.pack,
        options: contract.options,
        amount: contract.amount,
        monthly: contract.monthly,
        status: contract.status,
        signed_on: contract.signedOn,
        delivered_on: contract.deliveredOn,
        site_url: contract.siteUrl,
        brought_by: contract.broughtBy,
        note: contract.note,
        created_at: contract.createdAt,
        updated_at: contract.updatedAt,
      }),
    );
  }

  async deleteContract(id: string): Promise<void> {
    check("la suppression du contrat", await this.db.from("contracts").delete().eq("id", id));
  }

  async getStatsSince(): Promise<string | null> {
    const row = check("la lecture des réglages", await this.db.from("app_settings").select("stats_since").eq("id", true).maybeSingle());
    return (row as { stats_since: string | null } | null)?.stats_since ?? null;
  }

  async setStatsSince(at: string): Promise<void> {
    check("la remise à zéro des statistiques", await this.db.from("app_settings").upsert({ id: true, stats_since: at }));
  }

  async listResources(): Promise<Resource[]> {
    const rows = check("la lecture des ressources", await this.db.from("resources").select("id, kind, title, value, note, sort_order"));
    return (rows as ResourceRow[]).map(toResource);
  }

  async saveResource(resource: Resource): Promise<void> {
    check(
      "l'enregistrement de la ressource",
      await this.db.from("resources").upsert({
        id: resource.id,
        kind: resource.kind,
        title: resource.title,
        value: resource.value,
        note: resource.note,
        sort_order: resource.sortOrder,
      }),
    );
  }

  async deleteResource(id: string): Promise<void> {
    check("la suppression de la ressource", await this.db.from("resources").delete().eq("id", id));
  }

  async listMessages(limit: number): Promise<Message[]> {
    const rows = check(
      "la lecture des messages",
      await this.db.from("messages").select(MESSAGE_COLUMNS).order("created_at", { ascending: false }).limit(limit),
    );
    return (rows as MessageRow[]).map(toMessage);
  }

  async getMessage(id: string): Promise<Message | null> {
    const row = check("la lecture du message", await this.db.from("messages").select(MESSAGE_COLUMNS).eq("id", id).maybeSingle());
    return row ? toMessage(row as MessageRow) : null;
  }

  async addMessage(message: Message): Promise<void> {
    check(
      "l'envoi du message",
      await this.db.from("messages").insert({
        id: message.id,
        author_id: message.authorId,
        body: message.text,
        attachments: message.attachments,
        created_at: message.createdAt,
      }),
    );
  }

  async deleteMessage(id: string): Promise<void> {
    check("la suppression du message", await this.db.from("messages").delete().eq("id", id));
  }

  async storeFile({ blob, ...meta }: NewFile): Promise<StoredFile> {
    const id = crypto.randomUUID();
    check("l'envoi du fichier", await this.db.storage.from(FILES_BUCKET).upload(id, blob, { contentType: meta.type, upsert: false }));
    const row = {
      id,
      uploader_id: meta.uploaderId,
      message_id: null,
      name: meta.name,
      type: meta.type,
      size: meta.size,
      kind: meta.kind,
      created_at: meta.createdAt,
    };
    const inserted = await this.db.from("message_files").insert(row);
    if (inserted.error) {
      await this.db.storage.from(FILES_BUCKET).remove([id]);
      check("l'enregistrement du fichier", inserted);
    }
    return toStoredFile(row);
  }

  async getFile(id: string): Promise<StoredFile | null> {
    const row = check("la lecture du fichier", await this.db.from("message_files").select(FILE_COLUMNS).eq("id", id).maybeSingle());
    return row ? toStoredFile(row as FileRow) : null;
  }

  async readFile(id: string): Promise<Uint8Array | null> {
    const { data, error } = await this.db.storage.from(FILES_BUCKET).download(id);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
  }

  async listPendingFiles(uploaderId: string): Promise<StoredFile[]> {
    const rows = check(
      "la lecture des fichiers en attente",
      await this.db.from("message_files").select(FILE_COLUMNS).eq("uploader_id", uploaderId).is("message_id", null),
    );
    return (rows as FileRow[]).map(toStoredFile);
  }

  async linkFiles(ids: string[], messageId: string, uploaderId: string): Promise<number> {
    if (ids.length === 0) return 0;
    // Conditions dans la requête : deux envois simultanés ne rattachent pas le même fichier deux fois.
    const rows = check(
      "le rattachement des fichiers",
      await this.db
        .from("message_files")
        .update({ message_id: messageId })
        .in("id", ids)
        .eq("uploader_id", uploaderId)
        .is("message_id", null)
        .select("id"),
    );
    return (rows as { id: string }[]).length;
  }

  async deleteFile(id: string): Promise<void> {
    check("la suppression du fichier", await this.db.storage.from(FILES_BUCKET).remove([id]));
    check("la suppression du fichier", await this.db.from("message_files").delete().eq("id", id));
  }

  async storageUsage(): Promise<{ files: number; bytes: number }> {
    let files = 0;
    let bytes = 0;
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const rows = check(
        "la lecture de l'espace utilisé",
        await this.db.from("message_files").select("size").order("id").range(offset, offset + PAGE_SIZE - 1),
      ) as { size: number }[];
      files += rows.length;
      bytes += rows.reduce((sum, row) => sum + row.size, 0);
      if (rows.length < PAGE_SIZE) return { files, bytes };
    }
  }

  async recordPresence(memberId: string, day: IsoDate, at: string): Promise<void> {
    // Une seule requête (fonction SQL) : la première visite du jour est gardée, la dernière avance.
    check("l'enregistrement de la visite", await this.db.rpc("record_presence", { p_member: memberId, p_day: day, p_at: at }));
  }

  async listPresence(range: DateRange): Promise<PresenceDay[]> {
    const rows = check(
      "la lecture des visites",
      await this.db.from("member_days").select("member_id, day, first_seen_at, last_seen_at").gte("day", range.from).lte("day", range.to),
    ) as PresenceRow[];
    return rows.map((row) => ({ memberId: row.member_id, day: row.day, firstSeenAt: row.first_seen_at, lastSeenAt: row.last_seen_at }));
  }

  async recordLogin(event: Omit<LoginEvent, "id">): Promise<void> {
    check(
      "le journal des connexions",
      await this.db.from("login_events").insert({ member_id: event.memberId, login: event.login, ok: event.ok, at: event.at }),
    );
    const cutoff = new Date(Date.parse(event.at) - LOGIN_EVENTS_KEPT_DAYS * 24 * 60 * 60_000).toISOString();
    check("le nettoyage du journal des connexions", await this.db.from("login_events").delete().lt("at", cutoff));
  }

  async listLoginEvents(since: string, limit: number): Promise<LoginEvent[]> {
    const rows = check(
      "la lecture des connexions",
      await this.db.from("login_events").select("id, member_id, login, ok, at").gte("at", since).order("at", { ascending: false }).limit(limit),
    ) as LoginEventRow[];
    return rows.map((row) => ({ id: String(row.id), memberId: row.member_id, login: row.login, ok: row.ok, at: row.at }));
  }
}
