import type { Contract, DateRange, Member, MemberPatch, Message, Prospect, Resource, StoredFile } from "../types";

/** Membre avec ses informations de connexion (jamais envoyées au navigateur). */
export type Credentials = {
  member: Member;
  passwordHash: string | null;
  /** Incrémentée à chaque changement de mot de passe : les anciennes sessions expirent. */
  sessionVersion: number;
};

export type NewMember = Omit<Member, "id" | "welcomedAt" | "lastLoginAt"> & { passwordHash: string };

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
  /** Derniers prospects saisis, tous membres confondus. */
  listRecentProspects(limit: number): Promise<Prospect[]>;
  /** Candidats dont le nom normalisé contient ce mot (pour la recherche et les doublons). */
  findProspectsByNameToken(token: string): Promise<Prospect[]>;
  countEstablishments(): Promise<number>;
  getProspect(id: string): Promise<Prospect | null>;
  addProspect(prospect: Prospect): Promise<void>;
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

  /** Derniers messages de l'échange, du plus récent au plus ancien. Supprimer un message détache ses fichiers. */
  listMessages(limit: number): Promise<Message[]>;
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
