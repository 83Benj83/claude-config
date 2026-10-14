/**
 * Contrat des actions de l'application. Le site les implémente avec des
 * Server Actions ; l'aperçu interactif avec son stockage partagé. Les écrans
 * ne connaissent que ce contrat.
 */
import type { DuplicateCheck, Establishment } from "./establishments";
import type { RowStatus } from "./prospect-import";
import type { Attachment, Prospect } from "./types";
import type { MessagesView } from "./views";

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
  /** Import d'une liste : verdict de chaque ligne (rien n'est enregistré), puis enregistrement. */
  analyzeImport(rows: ProspectFormValues[]): Promise<ActionResult<RowStatus[]>>;
  importProspects(input: { rows: ProspectFormValues[]; includeKnown: boolean }): Promise<ActionResult<{ added: number; skipped: number }>>;
  checkEstablishment(input: { name: string; city: string }): Promise<DuplicateCheck>;
  /** Liste « À contacter » : cocher un commerce contacté, annuler la coche, retirer un commerce (admin). */
  claimLead(input: { id: string; channel: string }): Promise<ActionResult<{ prospect: Prospect }>>;
  releaseLead(id: string): Promise<ActionResult>;
  deleteLead(id: string): Promise<ActionResult>;
  searchDirectory(input: { query: string; city: string }): Promise<Establishment[]>;

  saveResource(input: ResourceFormValues): Promise<ActionResult>;
  deleteResource(id: string): Promise<ActionResult>;
  saveMember(input: MemberFormValues): Promise<ActionResult>;
  resetStatistics(input: { confirmation: string }): Promise<ActionResult>;

  saveContract(input: ContractFormValues): Promise<ActionResult>;
  deleteContract(id: string): Promise<ActionResult>;

  exportCsv(input: { month: string; kind: "bilan" | "prospects" }): Promise<ActionResult<CsvExport>>;

  /** Échange : `null` si la session a expiré. */
  listMessages(): Promise<MessagesView | null>;
  /** Un fichier par appel (champ `file`), envoyé dès qu'il est choisi. */
  uploadAttachment(form: FormData): Promise<ActionResult<Attachment>>;
  discardAttachment(id: string): Promise<ActionResult>;
  sendMessage(input: { text: string; attachmentIds: string[] }): Promise<ActionResult>;
  deleteMessage(id: string): Promise<ActionResult>;
  chatStatus(): Promise<ChatStatus>;
};

/** Dernier message de l'échange, pour signaler les nouveaux messages. */
export type ChatStatus = { latestAt: string | null; latestAuthorId: string | null };

export const GENERIC_ERROR = "L'opération a échoué. Réessaie dans un instant.";
export const SESSION_EXPIRED = "Ta session a expiré : reconnecte-toi.";
export const ADMIN_ONLY = "Action réservée aux administrateurs.";
