import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DateRange, Entry, Member, MemberPatch } from "../types";
import type { Repository } from "./repository";

type ProfileRow = {
  id: string;
  full_name: string;
  job_title: string;
  department: string | null;
  manager_id: string | null;
  avatar_url: string | null;
  is_prospector: boolean;
  is_admin: boolean;
  sort_order: number;
};

type EntryRow = { user_id: string; entry_date: string; count: number };

const PROFILE_COLUMNS =
  "id, full_name, job_title, department, manager_id, avatar_url, is_prospector, is_admin, sort_order";

/** Taille de page pour contourner la limite de 1000 lignes de PostgREST. */
const PAGE_SIZE = 1000;

const toMember = (row: ProfileRow): Member => ({
  id: row.id,
  fullName: row.full_name,
  jobTitle: row.job_title,
  department: row.department,
  managerId: row.manager_id,
  avatarUrl: row.avatar_url,
  isProspector: row.is_prospector,
  isAdmin: row.is_admin,
  sortOrder: row.sort_order,
});

const toProfilePatch = (patch: MemberPatch): Partial<ProfileRow> => {
  const row: Partial<ProfileRow> = {};
  if (patch.fullName !== undefined) row.full_name = patch.fullName;
  if (patch.jobTitle !== undefined) row.job_title = patch.jobTitle;
  if (patch.department !== undefined) row.department = patch.department;
  if (patch.managerId !== undefined) row.manager_id = patch.managerId;
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
  if (patch.isProspector !== undefined) row.is_prospector = patch.isProspector;
  if (patch.isAdmin !== undefined) row.is_admin = patch.isAdmin;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  return row;
};

export class DataAccessError extends Error {
  constructor(operation: string, cause: { message: string }) {
    super(`Supabase: échec de ${operation} (${cause.message})`);
    this.name = "DataAccessError";
  }
}

export class SupabaseRepository implements Repository {
  /**
   * @param session client de l'utilisateur connecté (lectures et saisies, RLS active)
   * @param admin client clé secrète, uniquement pour les modifications réservées aux admins
   */
  constructor(
    private readonly session: SupabaseClient,
    private readonly admin: SupabaseClient,
  ) {}

  async listMembers(): Promise<Member[]> {
    const { data, error } = await this.session
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .order("sort_order")
      .order("full_name");
    if (error) throw new DataAccessError("la lecture des membres", error);
    return (data as ProfileRow[]).map(toMember);
  }

  async getMember(id: string): Promise<Member | null> {
    const { data, error } = await this.session
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new DataAccessError("la lecture du profil", error);
    return data ? toMember(data as ProfileRow) : null;
  }

  async listEntries({ from, to }: DateRange): Promise<Entry[]> {
    const entries: Entry[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await this.session
        .from("prospecting_entries")
        .select("user_id, entry_date, count")
        .gte("entry_date", from)
        .lte("entry_date", to)
        .order("entry_date")
        .order("user_id")
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw new DataAccessError("la lecture des prospections", error);
      const rows = data as EntryRow[];
      entries.push(...rows.map((row) => ({ memberId: row.user_id, date: row.entry_date, count: row.count })));
      if (rows.length < PAGE_SIZE) return entries;
    }
  }

  async upsertEntry(entry: Entry): Promise<void> {
    const { error } = await this.session
      .from("prospecting_entries")
      .upsert(
        { user_id: entry.memberId, entry_date: entry.date, count: entry.count },
        { onConflict: "user_id,entry_date" },
      );
    if (error) throw new DataAccessError("l'enregistrement de la journée", error);
  }

  async updateMember(id: string, patch: MemberPatch): Promise<void> {
    const { error } = await this.admin.from("profiles").update(toProfilePatch(patch)).eq("id", id);
    if (error) throw new DataAccessError("la mise à jour du membre", error);
  }
}
