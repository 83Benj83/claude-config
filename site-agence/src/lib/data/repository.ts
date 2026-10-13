import type { DateRange, Entry, Member, MemberPatch } from "../types";

/**
 * Accès aux données de l'équipe. Deux implémentations :
 * - `SupabaseRepository` en production (Postgres + RLS),
 * - `DemoRepository` en mémoire quand Supabase n'est pas configuré.
 *
 * Les autorisations (qui peut modifier quoi) sont vérifiées dans les Server
 * Actions avant d'appeler le repository.
 */
export interface Repository {
  listMembers(): Promise<Member[]>;
  getMember(id: string): Promise<Member | null>;
  listEntries(range: DateRange): Promise<Entry[]>;
  upsertEntry(entry: Entry): Promise<void>;
  updateMember(id: string, patch: MemberPatch): Promise<void>;
}
