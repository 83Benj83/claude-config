/**
 * Contrat des actions de l'application. Le site les implémente avec des
 * Server Actions ; l'aperçu interactif avec son stockage partagé. Les écrans
 * ne connaissent que ce contrat.
 */
import type { DuplicateCheck, Establishment } from "./establishments";
import type { Prospect } from "./types";

export type ActionResult<T = null> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message?: string; errors?: Record<string, string> };

export type ProspectFormValues = {
  name: string;
  city: string;
  channel: string;
  contact: string;
  note: string;
  date: string;
};

export type MemberFormValues = {
  id: string;
  login: string;
  fullName: string;
  jobTitle: string;
  department: string;
  managerId: string;
  avatarUrl: string;
  password: string;
  isProspector: boolean;
  isAdmin: boolean;
  active: boolean;
};

export type ResourceFormValues = {
  id: string;
  kind: string;
  title: string;
  value: string;
  note: string;
  sortOrder: string;
};

export type ContractFormValues = {
  id: string;
  client: string;
  city: string;
  contact: string;
  pack: string;
  options: string;
  amount: string;
  monthly: string;
  status: string;
  signedOn: string;
  deliveredOn: string;
  siteUrl: string;
  broughtBy: string;
  note: string;
};

export type CsvExport = { filename: string; content: string };

export type AppActions = {
  signIn(input: { login: string; password: string }): Promise<ActionResult<{ next: string }>>;
  signOut(): Promise<void>;
  completeWelcome(input: { fullName: string }): Promise<ActionResult>;

  addProspect(input: ProspectFormValues): Promise<ActionResult<{ prospect: Prospect; todayCount: number }>>;
  deleteProspect(id: string): Promise<ActionResult>;
  checkEstablishment(input: { name: string; city: string }): Promise<DuplicateCheck>;
  searchDirectory(input: { query: string; city: string }): Promise<Establishment[]>;

  saveResource(input: ResourceFormValues): Promise<ActionResult>;
  deleteResource(id: string): Promise<ActionResult>;
  saveMember(input: MemberFormValues): Promise<ActionResult>;
  resetStatistics(input: { confirmation: string }): Promise<ActionResult>;

  saveContract(input: ContractFormValues): Promise<ActionResult>;
  deleteContract(id: string): Promise<ActionResult>;

  exportCsv(input: { month: string; kind: "bilan" | "prospects" }): Promise<ActionResult<CsvExport>>;
};

export const GENERIC_ERROR = "L'opération a échoué. Réessaie dans un instant.";
export const SESSION_EXPIRED = "Ta session a expiré : reconnecte-toi.";
export const ADMIN_ONLY = "Action réservée aux administrateurs.";
