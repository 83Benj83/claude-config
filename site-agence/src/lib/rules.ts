/** Règles métier partagées entre l'interface, la validation serveur et la base. */

/** Nombre de jours passés pendant lesquels on peut encore saisir ou supprimer un prospect. */
export const EDITABLE_PAST_DAYS = 7;

/** Longueur minimale des mots de passe définis par un admin. */
export const MIN_PASSWORD_LENGTH = 6;

/** Durée de la session après connexion. */
export const SESSION_DAYS = 30;

/** Échange : longueur d'un message, pièces jointes par message, poids d'un fichier. */
export const MESSAGE_MAX_LENGTH = 2000;
export const MESSAGE_MAX_FILES = 4;
/** 4 Mo : un envoi tient dans une requête serveur (limite des hébergeurs) ; les photos sont réduites avant l'envoi. */
export const ATTACHMENT_MAX_BYTES = 4 * 1024 * 1024;
/** Fichiers en attente (choisis, pas encore envoyés) par personne, et leur durée de vie. */
export const PENDING_FILES_MAX = 20;
export const PENDING_FILES_TTL_MS = 24 * 60 * 60_000;
/** Messages affichés dans l'échange (les plus récents). */
export const MESSAGES_SHOWN = 200;

/** Activité (admins) : présence notée au plus toutes les 5 minutes, suivie sur 7 jours. */
export const PRESENCE_REFRESH_MS = 5 * 60_000;
export const ACTIVITY_DAYS = 7;
/** Connexions affichées dans le journal (les plus récentes), lues pour les compter, et gardées. */
export const LOGIN_EVENTS_SHOWN = 40;
export const LOGIN_EVENTS_READ = 500;
export const LOGIN_EVENTS_KEPT_DAYS = 90;
/** Messages lus pour compter l'activité de la semaine. */
export const ACTIVITY_MESSAGES = 500;
/** Espace de stockage des fichiers compris dans l'offre gratuite de Supabase. */
export const STORAGE_QUOTA_BYTES = 1024 ** 3;

/** Tailles possibles d'un fichier de commerces extrait de la liste « À contacter ». */
export const BATCH_SIZES = [10, 20, 30, 40, 50] as const;
/** Rappels faits : gardés visibles pendant ce délai (heures). */
export const CALLBACK_DONE_VISIBLE_HOURS = 48;

/** Une liste importée dans « À contacter » : 500 lignes au plus. */
export const LEAD_IMPORT_MAX_ROWS = 500;
