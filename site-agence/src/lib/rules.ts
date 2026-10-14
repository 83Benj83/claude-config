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
