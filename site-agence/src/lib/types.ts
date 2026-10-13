/** Date calendaire au format ISO `YYYY-MM-DD` (fuseau Europe/Paris). */
export type IsoDate = string;

/** Mois au format `YYYY-MM`. */
export type MonthKey = string;

export type Member = {
  id: string;
  fullName: string;
  jobTitle: string;
  department: string | null;
  managerId: string | null;
  avatarUrl: string | null;
  isProspector: boolean;
  isAdmin: boolean;
  sortOrder: number;
};

export type MemberPatch = Partial<
  Pick<
    Member,
    | "fullName"
    | "jobTitle"
    | "department"
    | "managerId"
    | "avatarUrl"
    | "isProspector"
    | "isAdmin"
    | "sortOrder"
  >
>;

export type Entry = {
  memberId: string;
  date: IsoDate;
  count: number;
};

export type Period = "jour" | "semaine" | "mois";

export type DateRange = {
  from: IsoDate;
  to: IsoDate;
};
