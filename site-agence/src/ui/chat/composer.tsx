"use client";

import { CircleNotchIcon, ImageIcon, PaperclipIcon, PaperPlaneRightIcon, WarningCircleIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { GENERIC_ERROR } from "@/lib/actions-contract";
import { ACCEPTED_FILES_LABEL, FILE_ACCEPT, formatBytes } from "@/lib/attachments";
import { MESSAGE_MAX_FILES, MESSAGE_MAX_LENGTH } from "@/lib/rules";
import type { Attachment } from "@/lib/types";
import { usePlatform } from "../platform";
import { controlClasses } from "../primitives/field";
import { shrinkImage } from "./shrink-image";

type Pending = { key: string; name: string } & (
  | { status: "uploading" }
  | { status: "ready"; attachment: Attachment }
  | { status: "error"; error: string }
);

const iconButton =
  "grid size-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-40";

/**
 * Zone d'écriture : texte, photos et fichiers. Chaque fichier part dès qu'il
 * est choisi ; le message est envoyé quand tout est prêt.
 */
export function Composer({
  channel,
  channelLabel,
  canPost,
  replyTo,
  onCancelReply,
  onSent,
}: {
  channel: string;
  channelLabel: string;
  canPost: boolean;
  replyTo: { id: string; authorName: string; text: string } | null;
  onCancelReply: () => void;
  onSent: () => void;
}) {
  const { actions, canUpload } = usePlatform();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, startSending] = useTransition();
  const photoInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  /** Fichiers retirés avant la fin de leur envoi : supprimés dès qu'ils arrivent. */
  const removed = useRef(new Set<string>());

  // En quittant l'écran, les fichiers choisis mais pas envoyés sont retirés.
  const latest = useRef(pending);
  useEffect(() => {
    latest.current = pending;
  });
  useEffect(
    () => () => {
      for (const item of latest.current) if (item.status === "ready") void actions.discardAttachment(item.attachment.id);
    },
    [actions],
  );

  const ready = pending.filter((item) => item.status === "ready");
  const uploading = pending.some((item) => item.status === "uploading");
  const tooLong = text.length > MESSAGE_MAX_LENGTH;
  const canSend = !sending && !uploading && !tooLong && (text.trim().length > 0 || ready.length > 0);

  const upload = async (key: string, original: File) => {
    try {
      const form = new FormData();
      form.append("file", await shrinkImage(original));
      const result = await actions.uploadAttachment(form);
      if (removed.current.has(key)) {
        if (result.ok) void actions.discardAttachment(result.data.id);
        return;
      }
      setPending((current) =>
        current.map((item) =>
          item.key !== key
            ? item
            : result.ok
              ? {
                  key,
                  name: result.data.name,
                  status: "ready",
                  attachment: result.data,
                }
              : {
                  key,
                  name: item.name,
                  status: "error",
                  error: result.message ?? GENERIC_ERROR,
                },
        ),
      );
    } catch {
      setPending((current) => current.map((item) => (item.key === key ? { key, name: item.name, status: "error", error: GENERIC_ERROR } : item)));
    }
  };

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setError(null);
    const room = MESSAGE_MAX_FILES - pending.filter((item) => item.status !== "error").length;
    const chosen = [...list].slice(0, Math.max(0, room));
    if (chosen.length < list.length) setError(`${MESSAGE_MAX_FILES} fichiers au plus par message.`);
    const added = chosen.map((file) => ({
      key: crypto.randomUUID(),
      name: file.name,
      status: "uploading" as const,
      file,
    }));
    setPending((current) => [...current, ...added.map(({ file, ...item }) => item)]);
    for (const { key, file } of added) void upload(key, file);
  };

  const remove = (item: Pending) => {
    setPending((current) => current.filter((candidate) => candidate.key !== item.key));
    if (item.status === "uploading") removed.current.add(item.key);
    if (item.status === "ready") void actions.discardAttachment(item.attachment.id);
  };

  const send = () => {
    if (!canSend) return;
    startSending(async () => {
      const result = await actions.sendMessage({
        text,
        attachmentIds: ready.map((item) => item.attachment.id),
        channel,
        replyTo: replyTo?.id ?? null,
      });
      if (!result.ok) {
        setError(result.message ?? GENERIC_ERROR);
        return;
      }
      setText("");
      setPending([]);
      setError(null);
      onCancelReply();
      onSent();
    });
  };

  // Ordinateur : Entrée envoie, Maj + Entrée va à la ligne. Téléphone : la touche Entrée va à la ligne.
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    event.preventDefault();
    send();
  };

  if (!canPost) {
    return (
      <p className="border-t border-line bg-surface px-4 py-4 text-center text-sm text-muted">
        Salon en lecture seule : seuls les admins écrivent dans « {channelLabel} ».
      </p>
    );
  }

  return (
    <div className="border-t border-line bg-surface px-2 pt-2 pb-2.5 sm:px-4 sm:pt-3">
      {replyTo && (
        <p className="mb-2 flex items-center gap-2 rounded-xl border-l-2 border-accent bg-surface-2 py-1.5 pr-1.5 pl-3 text-xs text-muted">
          <span className="min-w-0 flex-1 truncate">
            Réponse à <strong className="font-semibold text-fg">{replyTo.authorName}</strong> : {replyTo.text}
          </span>
          <button type="button" onClick={onCancelReply} className="grid size-6 shrink-0 place-items-center rounded-full hover:bg-surface" aria-label="Annuler la réponse">
            <XIcon size={12} aria-hidden />
          </button>
        </p>
      )}
      {pending.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5 px-1" aria-label="Fichiers à envoyer">
          {pending.map((item) => (
            <li
              key={item.key}
              className={`flex max-w-full items-center gap-1.5 rounded-full border py-1 pr-1 pl-2.5 text-xs ${
                item.status === "error" ? "border-danger bg-danger-soft text-danger" : "border-line bg-surface-2 text-fg"
              }`}
            >
              {item.status === "uploading" && <CircleNotchIcon size={14} className="shrink-0 animate-spin" aria-label="Envoi en cours" />}
              {item.status === "error" && <WarningCircleIcon size={14} weight="fill" className="shrink-0" aria-hidden />}
              <span className="max-w-[12rem] truncate font-medium">{item.name}</span>
              {item.status === "ready" && <span className="shrink-0 text-subtle">{formatBytes(item.attachment.size)}</span>}
              {item.status === "error" && <span className="sr-only">: {item.error}</span>}
              <button
                type="button"
                onClick={() => remove(item)}
                className="grid size-6 shrink-0 place-items-center rounded-full hover:bg-surface"
                aria-label={`Retirer ${item.name}`}
              >
                <XIcon size={12} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {pending.map((item) =>
        item.status === "error" ? (
          <p key={`${item.key}-error`} role="alert" className="mb-1.5 px-2 text-xs text-danger">
            {item.error}
          </p>
        ) : null,
      )}
      {error && (
        <p role="alert" className="mb-1.5 px-2 text-xs text-danger">
          {error}
        </p>
      )}

      <div className="flex items-end gap-1">
        {canUpload && (
          <>
            <button
              type="button"
              onClick={() => photoInput.current?.click()}
              className={iconButton}
              aria-label="Ajouter une photo"
              title="Ajouter une photo"
            >
              <ImageIcon size={22} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className={iconButton}
              aria-label="Joindre un fichier"
              title="Joindre un fichier"
            >
              <PaperclipIcon size={22} aria-hidden />
            </button>
          </>
        )}
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={`Écris dans ${channelLabel}…`}
          aria-label="Message"
          aria-invalid={tooLong || undefined}
          className={`${controlClasses} field-sizing-content max-h-40 min-h-11 flex-1 resize-none rounded-3xl py-2.5`}
        />
        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-on-accent transition-[filter,transform] hover:brightness-105 active:scale-95 disabled:opacity-40"
          aria-label="Envoyer"
          title="Envoyer"
        >
          {sending ? <CircleNotchIcon size={20} className="animate-spin" aria-hidden /> : <PaperPlaneRightIcon size={20} weight="fill" aria-hidden />}
        </button>
      </div>
      <p className="mt-1.5 hidden px-2 text-xs text-subtle sm:block">
        {tooLong
          ? `Message trop long : ${text.length} / ${MESSAGE_MAX_LENGTH} caractères.`
          : canUpload
            ? `Entrée pour envoyer, Maj + Entrée pour aller à la ligne. Fichiers : ${ACCEPTED_FILES_LABEL}, 4 Mo au plus.`
            : "Entrée pour envoyer, Maj + Entrée pour aller à la ligne."}
      </p>
      {!canUpload && (
        <p className="mt-1 px-2 text-xs text-subtle">Avec ton accès à l&apos;aperçu, tu peux écrire mais pas envoyer de photos ni de fichiers.</p>
      )}

      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        aria-label="Photos à envoyer"
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={fileInput}
        type="file"
        accept={FILE_ACCEPT}
        multiple
        className="hidden"
        aria-label="Fichiers à envoyer"
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
