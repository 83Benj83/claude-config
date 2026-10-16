import type { Callback, Contract, DateRange, Entry, IsoDate, Lead, LeadBatch, LeadOutcome, LoginEvent, Member, MemberPatch, Mockup, Message, PresenceDay, Prospect, Resource, StoredFile } from "../types";

/** Membre avec ses informations de connexion (jamais envoyées au navigateur). */
export type Credentials = {
  member: Member;
  passwordHash: string | null;
  /** Incrémentée à chaque changement de mot de passe : les anciennes sessions expirent. */
  sessionVersion: number;
};

export type NewMember = Omit<Member, "id" | "welcomedAt" | "lastLoginAt" | "lastSeenAt"> & { passwordHash: string };

/** Fichier à enregistrer : son identifiant est choisi par le stockage. */
export type NewFile = Omit<StoredFile, "id" | "messageId"> & { blob: Blob };

export type MemberUpdate = MemberPatch & {
  passwordHash?: string;
  /** Invalide toutes les sessions ouvertes de ce membre. */
  revokeSessions?: boolean;
};

/**
 * Accès aux données. Deux implémentations :
 * - `SupabaseRepository` en production (Postgres, accès serveur uniquement) ;
 * - `DemoRepository` en mémoire quand Supabase n'est pas configuré.
 *
 * Les autorisations (qui peut faire quoi) sont vérifiées dans les Server
 * Actions avant d'appeler le repository.
 */
export interface Repository {
  listMembers(): Promise<Member[]>;
  getCredentialsById(id: string): Promise<Credentials | null>;
  /** Recherche insensible à la casse et aux accents. */
  getCredentialsByLogin(login: string): Promise<Credentials | null>;
  createMember(member: NewMember): Promise<Member>;
  updateMember(id: string, update: MemberUpdate): Promise<void>;

  /** Prospects d'une période (toutes dates si absente). */
  listProspects(range?: DateRange): Promise<Prospect[]>;
  /** Prospects comptés par membre et par jour de contact, ajoutés depuis `since` (tous si `null`). */
  listEntries(range: DateRange, since: string | null): Promise<Entry[]>;
  /** Derniers prospects saisis, tous membres confondus. */
  listRecentProspects(limit: number): Promise<Prospect[]>;
  /** Candidats dont le nom normalisé contient ce mot (pour la recherche et les doublons). */
  findProspectsByNameToken(token: string): Promise<Prospect[]>;
  countEstablishments(): Promise<number>;
  getProspect(id: string): Promise<Prospect | null>;
  addProspect(prospect: Prospect): Promise<void>;
  /** Plusieurs prospects d'un coup (import d'une liste). */
  addProspects(prospects: Prospect[]): Promise<void>;
  deleteProspect(id: string): Promise<void>;

  listResources(): Promise<Resource[]>;
  saveResource(resource: Resource): Promise<void>;
  deleteResource(id: string): Promise<void>;

  /**
   * Instant (ISO) depuis lequel les prospects comptent dans les statistiques
   * (classement, bilan, compteurs). `null` : depuis toujours. L'historique
   * « déjà contacté ? » n'est jamais filtré.
   */
  getStatsSince(): Promise<string | null>;
  setStatsSince(at: string): Promise<void>;

  listContracts(): Promise<Contract[]>;
  getContract(id: string): Promise<Contract | null>;
  /** Crée ou remplace le contrat (même `id`). */
  saveContract(contract: Contract): Promise<void>;
  deleteContract(id: string): Promise<void>;

  listMockups(): Promise<Mockup[]>;
  getMockup(id: string): Promise<Mockup | null>;
  /** Crée ou remplace la maquette (même `id`). */
  saveMockup(mockup: Mockup): Promise<void>;
  deleteMockup(id: string): Promise<void>;

  /** Derniers messages de l'échange, du plus récent au plus ancien. Supprimer un message détache ses fichiers. */
  listMessages(limit: number, channel?: string): Promise<Message[]>;
  /** Épingle ou réactions : seuls ces champs changent. */
  updateMessage(id: string, patch: Partial<Pick<Message, "pinned" | "reactions">>): Promise<void>;
  getMessage(id: string): Promise<Message | null>;
  addMessage(message: Message): Promise<void>;
  deleteMessage(id: string): Promise<void>;

  /** Fichier envoyé, en attente jusqu'à ce que son message soit publié. */
  storeFile(file: NewFile): Promise<StoredFile>;
  getFile(id: string): Promise<StoredFile | null>;
  /** Fichiers de cette personne pas encore rattachés à un message. */
  listPendingFiles(uploaderId: string): Promise<StoredFile[]>;
  /** Contenu d'un fichier (le site le sert après vérification de la session). */
  readFile(id: string): Promise<Uint8Array | null>;
  /**
   * Rattache au message les fichiers encore en attente de cette personne ;
   * renvoie le nombre de fichiers rattachés (un fichier déjà publié ne l'est pas deux fois).
   */
  linkFiles(ids: string[], messageId: string, uploaderId: string): Promise<number>;
  deleteFile(id: string): Promise<void>;
  /** Liste « À contacter » : les commerces encore à contacter, et ceux cochés depuis `doneSince`. */
  listLeads(doneSince: string): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | null>;
  addLeads(leads: Lead[]): Promise<void>;
  /** Coche le commerce s'il est encore à contacter ; `false` si quelqu'un vient de le cocher. */
  claimLead(id: string, memberId: string, at: string, prospectId: string): Promise<boolean>;
  /** Sort le commerce de la liste pour un rappel (il n'est pas compté) ; `false` si quelqu'un l'a pris entre-temps. */
  deferLead(id: string, memberId: string, at: string): Promise<boolean>;
  /** Le remet dans la liste (coche annulée). */
  reopenLead(id: string): Promise<void>;
  deleteLead(id: string): Promise<void>;
  /** Range les commerces encore à contacter (avant une nouvelle liste) ; renvoie leur nombre. */
  archiveOpenLeads(): Promise<number>;
  /** Marque l'issue d'un commerce d'un fichier en cours (`null` : l'efface). */
  setLeadOutcome(id: string, outcome: LeadOutcome | null): Promise<void>;
  /** Fichiers en cours (non clos), tous membres confondus. */
  listActiveBatches(): Promise<LeadBatch[]>;
  /**
   * Crée le fichier du membre et y réserve jusqu'à `size` commerces encore à
   * contacter (avec téléphone d'abord, les plus anciens d'abord). Renvoie `null`
   * s'il a déjà un fichier en cours.
   */
  createBatch(batch: LeadBatch, size: number): Promise<{ batch: LeadBatch; leads: Lead[] } | null>;
  /** Commerces d'un fichier. */
  listBatchLeads(batchId: string): Promise<Lead[]>;
  /**
   * Clôt le fichier : les commerces appelés sont cochés (prospects fournis), ceux à
   * rappeler sont rangés ; plus rien n'est réservé.
   */
  /** Clôture atomique : false si le fichier était déjà clos (aucun prospect créé dans ce cas). */
  finishBatch(batchId: string, memberId: string, at: string, items: { leadId: string; prospect: Prospect }[]): Promise<boolean>;
  /** Abandonne le fichier : ses commerces non traités reviennent dans la liste. */
  releaseBatch(batchId: string): Promise<number>;
  /** Prospects dont le nom normalisé est l'un de ceux-ci (commerces déjà contactés). */
  findProspectsByNameKeys(nameKeys: string[]): Promise<Prospect[]>;

  /** Rappels : tous ceux à faire, et ceux faits depuis `doneSince`. */
  listCallbacks(doneSince: string): Promise<Callback[]>;
  getCallback(id: string): Promise<Callback | null>;
  /** Crée ou remplace le rappel (même `id`). */
  saveCallback(callback: Callback): Promise<void>;
  /** Le marque fait s'il ne l'est pas encore ; `false` si quelqu'un vient de le faire. */
  completeCallback(id: string, memberId: string, at: string): Promise<boolean>;
  reopenCallback(id: string): Promise<void>;
  deleteCallback(id: string): Promise<void>;

  /** Fichiers de l'échange : nombre et poids total. */
  storageUsage(): Promise<{ files: number; bytes: number }>;

  /** Visite d'un membre : première et dernière visite du jour, et dernière visite tout court. */
  recordPresence(memberId: string, day: IsoDate, at: string): Promise<void>;
  listPresence(range: DateRange): Promise<PresenceDay[]>;
  /** Essai de connexion avec un mot de passe (réussi ou refusé). */
  recordLogin(event: Omit<LoginEvent, "id">): Promise<void>;
  /** Connexions depuis cet instant, les plus récentes d'abord. */
  listLoginEvents(since: string, limit: number): Promise<LoginEvent[]>;
}

/** Clé d'identifiant : comparaison insensible à la casse, aux accents et aux espaces. */
export function loginKey(login: string): string {
  return login
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
