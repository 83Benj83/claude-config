/** Date calendaire au format ISO `YYYY-MM-DD` (fuseau Europe/Paris). */
export type IsoDate = string;

/** Mois au format `YYYY-MM`. */
export type MonthKey = string;

export type Member = {
  id: string;
  /** Identifiant choisi à la connexion (défini par un admin). */
  login: string;
  fullName: string;
  jobTitle: string;
  department: string | null;
  managerId: string | null;
  avatarUrl: string | null;
  isProspector: boolean;
  isAdmin: boolean;
  /** Un identifiant désactivé n'apparaît plus à la connexion ; son historique reste. */
  active: boolean;
  sortOrder: number;
  /** Date de la première connexion confirmée (écran de bienvenue), `null` avant. */
  welcomedAt: string | null;
  /** Dernière connexion avec le mot de passe (une session dure ensuite 30 jours). */
  lastLoginAt: string | null;
  /** Dernière visite sur le site, notée au plus toutes les 5 minutes (rubrique Activité). */
  lastSeenAt: string | null;
};

export type MemberPatch = Partial<
  Pick<
    Member,
    | "login"
    | "fullName"
    | "jobTitle"
    | "department"
    | "managerId"
    | "avatarUrl"
    | "isProspector"
    | "isAdmin"
    | "active"
    | "sortOrder"
    | "welcomedAt"
    | "lastLoginAt"
  >
>;

/** Identifiant visible sur l'écran de connexion (aucune donnée sensible). */
export type LoginChoice = Pick<Member, "id" | "login" | "fullName" | "avatarUrl">;

/** Moyen utilisé pour contacter un établissement. */
export type Channel =
  | "telephone"
  | "email"
  | "instagram"
  | "facebook"
  | "linkedin"
  | "visite"
  | "formulaire"
  | "autre";

/** Une prise de contact avec un établissement (un « prospect » du quota). */
export type Prospect = {
  id: string;
  memberId: string;
  name: string;
  city: string;
  channel: Channel;
  /** Numéro, adresse e-mail ou compte utilisé (facultatif). */
  contact: string | null;
  note: string | null;
  /** Jour de la prise de contact (heure de Paris). */
  date: IsoDate;
  createdAt: string;
};

export type ProspectInput = {
  name: string;
  city: string;
  channel: Channel;
  contact: string | null;
  note: string | null;
  date: IsoDate;
};

export type ResourceKind = "email" | "phone" | "template" | "link";

/** Adresse e-mail, modèle de message ou lien utilisé par l'équipe. */
export type Resource = {
  id: string;
  kind: ResourceKind;
  title: string;
  /** Adresse e-mail, URL, ou texte du modèle. */
  value: string;
  note: string | null;
  sortOrder: number;
};

export type ResourceInput = Omit<Resource, "id"> & { id: string | null };

/** Étapes d'un contrat, de la signature à la mise en ligne (« termine » = effectué). */
export type ContractStatus = "maquette" | "developpement" | "validation" | "termine";
export type ContractPack = "Essentiel" | "Pro" | "Signature" | "Sur mesure";

/** Un client signé : son site en cours de création, ou déjà livré. */
export type Contract = {
  id: string;
  /** Nom du commerce. */
  client: string;
  city: string | null;
  /** Interlocuteur : nom, téléphone, e-mail. */
  contact: string | null;
  pack: ContractPack;
  options: string | null;
  /** Montant payé une fois, en euros. */
  amount: number | null;
  /** Abonnement mensuel en euros (`null` : sans abonnement). */
  monthly: number | null;
  status: ContractStatus;
  signedOn: IsoDate;
  /** Mise en ligne (contrats effectués). */
  deliveredOn: IsoDate | null;
  siteUrl: string | null;
  /** Membre qui a apporté le client. */
  broughtBy: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MockupStatus = "en_cours" | "terminee";

/** Une maquette de site : en cours de réalisation, ou terminée (avant ou sans contrat signé). */
export type Mockup = {
  id: string;
  /** Nom du commerce. */
  client: string;
  city: string | null;
  contact: string | null;
  status: MockupStatus;
  startedOn: IsoDate;
  doneOn: IsoDate | null;
  /** Lien vers la maquette. */
  previewUrl: string | null;
  /** Membre qui la réalise. */
  madeBy: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Nombre de prospections d'un membre sur un jour (dérivé des prospects). */
export type Entry = {
  memberId: string;
  date: IsoDate;
  count: number;
};

export type Period = "semaine" | "mois" | "annee";

/** Commerce de la liste « À contacter » : à contacter, coché (devenu un prospect) ou rangé. */
export type LeadStatus = "open" | "done" | "archived";

/**
 * Issue d'un commerce d'un lot en cours : appelé (compté au classement à la
 * clôture du lot) ou à rappeler plus tard (il rejoint les rappels).
 */
export type LeadOutcome = "contacted" | "callback";

export type Lead = {
  id: string;
  name: string;
  city: string;
  /** Type de commerce (restaurant, coiffeur…). */
  category: string | null;
  phone: string | null;
  email: string | null;
  /** Adresses https des pages Instagram et Facebook. */
  instagram: string | null;
  facebook: string | null;
  note: string | null;
  /** Adresse postale (rue, code postal, ville). */
  address: string | null;
  /** Jusqu'à 3 infos courtes utiles pour l'appel (ce qui manque, un fait, un angle). */
  tips: string[];
  /** Jour de la liste (heure de Paris). */
  listDay: IsoDate;
  status: LeadStatus;
  /** Qui l'a coché, quand, et le prospect alors créé. */
  doneBy: string | null;
  doneAt: string | null;
  prospectId: string | null;
  /** Membre qui l'a ajouté à la liste (`null` : liste importée par un admin). */
  addedBy: string | null;
  /** Lot dans lequel un membre l'a extrait : il disparaît alors de la liste des autres. */
  batchId: string | null;
  outcome: LeadOutcome | null;
  createdAt: string;
};

/** Fichier de commerces extrait de la liste par un membre (10 à 50), clos quand tout est contacté. */
export type LeadBatch = {
  id: string;
  memberId: string;
  size: number;
  createdAt: string;
  finishedAt: string | null;
};

export type CallbackPriority = "faible" | "moyenne" | "haute" | "urgente";

/** Appel à refaire plus tard : visible de toute l'équipe jusqu'à ce qu'il soit fait. */
export type Callback = {
  id: string;
  /** Commerce à rappeler. */
  name: string;
  city: string | null;
  phone: string | null;
  /** Interlocuteur (personne à demander). */
  contactName: string | null;
  dueOn: IsoDate;
  /** Heure souhaitée `HH:MM` (heure de Paris), facultative. */
  dueTime: string | null;
  priority: CallbackPriority;
  note: string | null;
  /** Membre qui a enregistré le rappel. */
  addedBy: string;
  leadId: string | null;
  status: "pending" | "done";
  doneBy: string | null;
  doneAt: string | null;
  createdAt: string;
};

/** Présence d'un membre sur le site un jour donné (heure de Paris) : première et dernière visite. */
export type PresenceDay = {
  memberId: string;
  day: IsoDate;
  firstSeenAt: string;
  lastSeenAt: string;
};

/** Essai de connexion avec un mot de passe, réussi ou refusé. `memberId` vide : refusé, identifiant tel que saisi. */
export type LoginEvent = {
  id: string;
  memberId: string | null;
  login: string;
  ok: boolean;
  at: string;
};

export type DateRange = {
  from: IsoDate;
  to: IsoDate;
};

/* ------------------------------------------------------------------ */
/* Échange                                                             */
/* ------------------------------------------------------------------ */

/** Photo (affichée en vignette) ou fichier (à télécharger). */
export type AttachmentKind = "image" | "file";

/** Pièce jointe d'un message. `id` : clé du fichier dans le stockage. */
export type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  kind: AttachmentKind;
};

export type Message = {
  id: string;
  authorId: string;
  text: string;
  attachments: Attachment[];
  createdAt: string;
  /** Salon de l'échange (`general` par défaut). */
  channel: string;
  /** Message auquel celui-ci répond. */
  replyTo: string | null;
  /** Épinglé en haut du salon par un admin. */
  pinned: boolean;
  /** Réactions : emoji -> membres qui l'ont choisi. */
  reactions: Record<string, string[]>;
};

/** Fichier envoyé : d'abord en attente, puis rattaché au message publié. */
export type StoredFile = Attachment & {
  uploaderId: string;
  messageId: string | null;
  createdAt: string;
};
