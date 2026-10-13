import type { DateRange, Member, MemberPatch, Prospect, Resource } from "../types";

/** Membre avec ses informations de connexion (jamais envoyées au navigateur). */
export type Credentials = {
  member: Member;
  passwordHash: string | null;
  /** Incrémentée à chaque changement de mot de passe : les anciennes sessions expirent. */
  sessionVersion: number;
};

export type NewMember = Omit<Member, "id" | "welcomedAt" | "lastLoginAt"> & { passwordHash: string };

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
