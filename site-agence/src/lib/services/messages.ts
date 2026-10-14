import type { ActionResult } from "../actions-contract";
import { ACCEPTED_FILES_LABEL, cleanFileName, fileTypeOf, matchesSignature } from "../attachments";
import type { Repository } from "../data/repository";
import { ATTACHMENT_MAX_BYTES, MESSAGE_MAX_FILES, MESSAGE_MAX_LENGTH, PENDING_FILES_MAX, PENDING_FILES_TTL_MS } from "../rules";
import type { Attachment, Member, StoredFile } from "../types";

/**
 * Règles de l'échange, communes au site et à l'aperçu : toute l'équipe écrit
 * et envoie des fichiers ; un message se supprime par son auteur ou un admin.
 *
 * Un fichier est envoyé dès qu'il est choisi (en attente), puis rattaché au
 * message à l'envoi : seul celui qui l'a envoyé peut le joindre.
 */

/** Identifiant de fichier : UUID du site ou identifiant de fichier de l'aperçu. */
const FILE_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Suppression au mieux : un fichier déjà absent ne bloque pas l'opération en cours. */
async function deleteQuietly(repository: Repository, id: string) {
  try {
    await repository.deleteFile(id);
  } catch (error) {
    console.error("[échange] fichier non supprimé", id, error);
  }
}

const toAttachment = ({ id, name, type, size, kind }: StoredFile): Attachment => ({ id, name, type, size, kind });

const isFile = (value: unknown): value is File =>
  typeof value === "object" && value !== null && typeof (value as Blob).arrayBuffer === "function" && typeof (value as File).name === "string";

export async function uploadAttachment(repository: Repository, actor: Member, file: unknown, now: string): Promise<ActionResult<Attachment>> {
  if (!isFile(file)) return { ok: false, message: "Aucun fichier reçu." };
  const name = cleanFileName(file.name);
  const fileType = fileTypeOf(name);
  if (!fileType)
    return {
      ok: false,
      message: `« ${name} » : type non accepté (${ACCEPTED_FILES_LABEL}).`,
    };
  if (file.size === 0) return { ok: false, message: `« ${name} » est vide.` };
  if (file.size > ATTACHMENT_MAX_BYTES) return { ok: false, message: `« ${name} » dépasse 4 Mo.` };
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  if (!matchesSignature(fileType, head))
    return {
      ok: false,
      message: `« ${name} » ne correspond pas à son extension.`,
    };

  // Fichiers choisis puis jamais envoyés : effacés après 24 h, et pas plus de 20 en attente par personne.
  const pending = await repository.listPendingFiles(actor.id);
  const stale = pending.filter((item) => Date.parse(now) - Date.parse(item.createdAt) > PENDING_FILES_TTL_MS);
  for (const item of stale) await deleteQuietly(repository, item.id);
  if (pending.length - stale.length >= PENDING_FILES_MAX) {
    return { ok: false, message: "Trop de fichiers en attente : envoie ton message ou retire des fichiers." };
  }

  const stored = await repository.storeFile({
    blob: file,
    name,
    type: fileType.type,
    size: file.size,
    kind: fileType.kind,
    uploaderId: actor.id,
    createdAt: now,
  });
  return { ok: true, data: toAttachment(stored) };
}

/** Retire une pièce jointe pas encore envoyée (seulement la sienne). */
export async function discardAttachment(repository: Repository, actor: Member, id: string): Promise<ActionResult> {
  const file = await repository.getFile(id);
  if (!file) return { ok: true, data: null };
  if (file.uploaderId !== actor.id || file.messageId) return { ok: false, message: "Ce fichier ne peut plus être retiré." };
  await repository.deleteFile(id);
  return { ok: true, data: null };
}

export async function sendMessage(
  repository: Repository,
  actor: Member,
  input: { text: unknown; attachmentIds: unknown },
  now: string,
): Promise<ActionResult> {
  const text = String(input?.text ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();
  const ids = Array.isArray(input?.attachmentIds) ? [...new Set(input.attachmentIds.map(String))] : [];
  if (ids.some((id) => !FILE_ID.test(id))) return { ok: false, message: "Pièce jointe invalide." };
  if (!text && ids.length === 0) return { ok: false, message: "Écris un message ou ajoute un fichier." };
  if (text.length > MESSAGE_MAX_LENGTH)
    return {
      ok: false,
      message: `Message trop long : ${MESSAGE_MAX_LENGTH} caractères au plus.`,
    };
  if (ids.length > MESSAGE_MAX_FILES)
    return {
      ok: false,
      message: `${MESSAGE_MAX_FILES} fichiers au plus par message.`,
    };

  const files = await Promise.all(ids.map((id) => repository.getFile(id)));
  const usable = files.filter((file): file is StoredFile => file !== null && file.uploaderId === actor.id && file.messageId === null);
  if (usable.length !== ids.length)
    return {
      ok: false,
      message: "Une pièce jointe n'est plus disponible : ajoute-la de nouveau.",
    };

  const message = {
    id: crypto.randomUUID(),
    authorId: actor.id,
    text,
    attachments: usable.map(toAttachment),
    createdAt: now,
  };
  await repository.addMessage(message);
  const linked = await repository.linkFiles(ids, message.id, actor.id);
  if (linked !== ids.length) {
    // Un fichier vient d'être publié ailleurs (double envoi) : on annule ce message.
    await repository.deleteMessage(message.id);
    return { ok: false, message: "Une pièce jointe n'est plus disponible : ajoute-la de nouveau." };
  }
  return { ok: true, data: null };
}

export async function deleteMessage(repository: Repository, actor: Member, id: string): Promise<ActionResult> {
  const message = await repository.getMessage(id);
  if (!message) return { ok: false, message: "Ce message n'existe plus." };
  if (message.authorId !== actor.id && !actor.isAdmin)
    return {
      ok: false,
      message: "Seul son auteur ou un admin peut supprimer ce message.",
    };
  await repository.deleteMessage(id);
  // Fichiers : au mieux (un fichier déjà absent ne bloque pas la suppression du message).
  for (const attachment of message.attachments) await deleteQuietly(repository, attachment.id);
  return { ok: true, data: null, message: "Message supprimé." };
}

/** Dernier message (pour signaler les nouveaux messages dans le menu). */
export async function chatStatus(repository: Repository): Promise<{ latestAt: string | null; latestAuthorId: string | null }> {
  const [latest] = await repository.listMessages(1);
  return {
    latestAt: latest?.createdAt ?? null,
    latestAuthorId: latest?.authorId ?? null,
  };
}

/** Fichier à servir : publié avec un message, ou en attente chez celui qui l'a envoyé. */
export async function readAttachment(repository: Repository, actor: Member, id: string): Promise<{ file: StoredFile; bytes: Uint8Array } | null> {
  const file = await repository.getFile(id);
  if (!file || (!file.messageId && file.uploaderId !== actor.id)) return null;
  const bytes = await repository.readFile(id);
  return bytes ? { file, bytes } : null;
}
