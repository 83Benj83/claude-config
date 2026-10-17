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

/** Saisie d'un rappel (formulaire de la rubrique Rappels, de la liste et de la prospection). */
export type CallbackFormValues = {
  name: string;
  city: string;
  phone: string;
  contactName: string;
  dueOn: string;
  dueTime: string;
  priority: string;
  note: string;
};

/** Ajout d'un numéro à contacter par un membre. */
export type LeadFormValues = { name: string; city: string; phone: string; category: string; note: string };

export type MockupFormValues = {
  id: string;
  client: string;
  city: string;
  contact: string;
  status: string;
  startedOn: string;
  doneOn: string;
  previewUrl: string;
  madeBy: string;
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
  /** Tous les membres peuvent ajouter un numéro à contacter. */
  addLead(input: LeadFormValues): Promise<ActionResult<{ id: string }>>;
  /** « À rappeler plus tard » depuis la liste : le commerce rejoint les rappels. */
  deferLead(input: { id: string; callback: CallbackFormValues }): Promise<ActionResult>;
  /** Fichiers de 10 à 50 commerces. */
  extractBatch(input: { size: number }): Promise<ActionResult<{ count: number }>>;
  handleBatchLead(input: { id: string; outcome: "contacted" | "callback" | "none"; callback?: CallbackFormValues }): Promise<ActionResult>;
  finishBatch(): Promise<ActionResult<{ counted: number }>>;
  releaseBatch(id: string): Promise<ActionResult>;
  /** Rappels (appels à refaire). */
  addCallback(input: CallbackFormValues): Promise<ActionResult>;
  completeCallback(id: string): Promise<ActionResult>;
  reopenCallback(id: string): Promise<ActionResult>;
  rescheduleCallback(input: { id: string; dueOn: string; dueTime: string; priority?: string }): Promise<ActionResult>;
  deleteCallback(id: string): Promise<ActionResult>;
  searchDirectory(input: { query: string; city: string }): Promise<Establishment[]>;

  saveResource(input: ResourceFormValues): Promise<ActionResult>;
  deleteResource(id: string): Promise<ActionResult>;
  saveMember(input: MemberFormValues): Promise<ActionResult>;
  resetStatistics(input: { confirmation: string }): Promise<ActionResult>;

  saveContract(input: ContractFormValues): Promise<ActionResult>;
  deleteContract(id: string): Promise<ActionResult>;
  saveMockup(input: MockupFormValues): Promise<ActionResult>;
  deleteMockup(id: string): Promise<ActionResult>;

  exportCsv(input: { month: string; kind: "bilan" | "prospects" }): Promise<ActionResult<CsvExport>>;

  /** Échange : `null` si la session a expiré. */
  listMessages(channel?: string): Promise<MessagesView | null>;
  /** Un fichier par appel (champ `file`), envoyé dès qu'il est choisi. */
  uploadAttachment(form: FormData): Promise<ActionResult<Attachment>>;
  discardAttachment(id: string): Promise<ActionResult>;
  sendMessage(input: { text: string; attachmentIds: string[]; channel?: string; replyTo?: string | null }): Promise<ActionResult>;
  toggleReaction(input: { id: string; emoji: string }): Promise<ActionResult>;
  togglePin(id: string): Promise<ActionResult>;
  deleteMessage(id: string): Promise<ActionResult>;
  chatStatus(): Promise<ChatStatus>;
  /** Rappels à faire aujourd'hui ou en retard (toute l'équipe). */
  callbacksDue(): Promise<number>;
};

/** Dernier message de l'échange, pour signaler les nouveaux messages. */
export type ChatStatus = { latestAt: string | null; latestAuthorId: string | null };

export const GENERIC_ERROR = "L'opération a échoué. Réessaie dans un instant.";
export const SESSION_EXPIRED = "Ta session a expiré : reconnecte-toi.";
export const ADMIN_ONLY = "Action réservée aux administrateurs.";
