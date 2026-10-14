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
  lastLoginAt: string | null;
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

/** Nombre de prospections d'un membre sur un jour (dérivé des prospects). */
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
