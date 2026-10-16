"use client";

import {
  ChatsCircleIcon,
  DownloadSimpleIcon,
  FileCsvIcon,
  FileDocIcon,
  FileIcon,
  FilePdfIcon,
  FilePptIcon,
  FileTextIcon,
  FileXlsIcon,
  ArrowBendUpLeftIcon,
  ImageBrokenIcon,
  PushPinIcon,
  SmileyIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { formatBytes } from "@/lib/attachments";
import { REACTIONS, splitMessageText } from "@/lib/chat";
import { APP_TIME_ZONE, formatRelativeDay, todayIso } from "@/lib/dates";
import { firstName } from "@/lib/format";
import type { Attachment } from "@/lib/types";
import type { MessageRow } from "@/lib/views";
import { usePlatform } from "../platform";
import { Avatar } from "../primitives/avatar";
import { EmptyState } from "../primitives/surface";
import { useToast } from "../primitives/toast";

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: APP_TIME_ZONE,
});
/** Deux messages de la même personne à moins de 5 minutes : un seul en-tête. */
const GROUP_WINDOW_MS = 5 * 60_000;

/** Icône du type de fichier (PDF, Word, Excel…). */
function FileTypeIcon({ type }: { type: string }) {
  const props = { size: 26, weight: "duotone", className: "shrink-0 text-accent-ink", "aria-hidden": true } as const;
  if (/pdf$/.test(type)) return <FilePdfIcon {...props} />;
  if (/wordprocessingml/.test(type)) return <FileDocIcon {...props} />;
  if (/spreadsheetml/.test(type)) return <FileXlsIcon {...props} />;
  if (/presentationml/.test(type)) return <FilePptIcon {...props} />;
  if (/csv$/.test(type)) return <FileCsvIcon {...props} />;
  if (/^text\//.test(type)) return <FileTextIcon {...props} />;
  return <FileIcon {...props} />;
}

type Day = { day: string; messages: { row: MessageRow; continued: boolean }[] };

function byDay(messages: MessageRow[]): Day[] {
  const days: Day[] = [];
  let previous: MessageRow | null = null;
  for (const row of messages) {
    const day = todayIso(new Date(row.createdAt));
    let current = days.at(-1);
    if (!current || current.day !== day) {
      current = { day, messages: [] };
      days.push(current);
      previous = null;
    }
    const continued =
      previous !== null && previous.authorId === row.authorId && Date.parse(row.createdAt) - Date.parse(previous.createdAt) < GROUP_WINDOW_MS;
    current.messages.push({ row, continued });
    previous = row;
  }
  return days;
}

/** Fil de la discussion : reste collé en bas tant qu'on n'est pas remonté lire plus haut. */
export function MessageList({
  messages,
  onChanged,
  onReply,
  canPin,
  emptyText,
}: {
  messages: MessageRow[];
  onChanged: () => void;
  onReply: (row: MessageRow) => void;
  canPin: boolean;
  emptyText?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const lastId = messages.at(-1)?.id;

  const scrollToBottom = () => {
    const list = listRef.current;
    if (list && stickToBottom.current) list.scrollTop = list.scrollHeight;
  };
  useLayoutEffect(scrollToBottom, [lastId]);

  const today = todayIso();
  return (
    <div
      ref={listRef}
      role="log"
      aria-label="Messages"
      onScroll={(event) => {
        const list = event.currentTarget;
        stickToBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < 120;
      }}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5"
    >
      {messages.length === 0 ? (
        <EmptyState icon={<ChatsCircleIcon size={22} aria-hidden />} title={emptyText ?? "Aucun message pour l'instant."}>
          {emptyText ? "Essaie un autre mot ou un autre filtre." : "Écris le premier : toute l'équipe le verra ici."}
        </EmptyState>
      ) : (
        byDay(messages).map(({ day, messages: rows }) => (
          <section key={day} aria-label={formatRelativeDay(day, today)} className="flex flex-col">
            <p
              className="mx-auto my-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted"
              suppressHydrationWarning
            >
              {formatRelativeDay(day, today)}
            </p>
            <ul className="flex flex-col">
              {rows.map(({ row, continued }) => (
                <MessageItem key={row.id} row={row} continued={continued} onMediaLoad={scrollToBottom} onChanged={onChanged} onReply={onReply} canPin={canPin} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function MessageItem({
  row,
  continued,
  onMediaLoad,
  onChanged,
  onReply,
  canPin,
}: {
  row: MessageRow;
  continued: boolean;
  onMediaLoad: () => void;
  onChanged: () => void;
  onReply: (row: MessageRow) => void;
  canPin: boolean;
}) {
  const images = row.attachments.filter((attachment) => attachment.kind === "image");
  const files = row.attachments.filter((attachment) => attachment.kind === "file");
  const time = timeFormatter.format(new Date(row.createdAt));
  return (
    <li className={`group flex gap-2.5 ${row.mine ? "flex-row-reverse" : ""} ${continued ? "mt-1" : "mt-4"}`}>
      {!row.mine && (
        <span className="w-9 shrink-0">
          {!continued && (
            <Avatar
              member={{
                fullName: row.authorName,
                avatarUrl: row.authorAvatarUrl,
              }}
              size="sm"
            />
          )}
        </span>
      )}
      <div className={`flex max-w-[85%] min-w-0 flex-col gap-1 sm:max-w-[70%] ${row.mine ? "items-end" : "items-start"}`}>
        {!continued && (
          <p className="px-1 text-xs text-subtle">
            <span className="font-semibold text-fg">{row.mine ? "Toi" : firstName(row.authorName)}</span> ·{" "}
            <time dateTime={row.createdAt} suppressHydrationWarning>
              {time}
            </time>
          </p>
        )}
        {row.pinned && (
          <p className="flex items-center gap-1 px-1 text-xs font-medium text-gold-ink">
            <PushPinIcon size={12} weight="fill" aria-hidden />
            Épinglé
          </p>
        )}
        {row.reply && (
          <p className="max-w-full truncate rounded-xl border-l-2 border-accent bg-surface-2 px-2.5 py-1 text-xs text-muted">
            <span className="font-semibold text-fg">{firstName(row.reply.authorName)}</span> {row.reply.text}
          </p>
        )}
        {row.text && (
          <p
            className={`rounded-2xl px-3.5 py-2 text-[0.9375rem] leading-relaxed break-words whitespace-pre-wrap ${
              row.mine ? "bg-accent text-on-accent" : "bg-surface-2 text-fg"
            }`}
          >
            <RichText text={row.text} mine={row.mine} />
          </p>
        )}
        {images.length > 0 && (
          <div className={`grid gap-1.5 ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {images.map((image) => (
              <ImageLink key={image.id} image={image} onLoad={onMediaLoad} />
            ))}
          </div>
        )}
        {files.map((file) => (
          <FileLink key={file.id} file={file} />
        ))}
        <Reactions row={row} onChanged={onChanged} />
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => onReply(row)}
            className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs text-subtle opacity-70 transition-opacity hover:text-fg hover:opacity-100 focus-visible:opacity-100"
          >
            <ArrowBendUpLeftIcon size={13} aria-hidden />
            Répondre
          </button>
          {canPin && <PinButton row={row} onChanged={onChanged} />}
          {row.canDelete && <DeleteMessage id={row.id} onDeleted={onChanged} />}
        </div>
      </div>
    </li>
  );
}

function ImageLink({ image, onLoad }: { image: Attachment; onLoad: () => void }) {
  const { fileUrl } = usePlatform();
  const [failed, setFailed] = useState(false);
  const url = fileUrl(image.id);
  if (failed) {
    return (
      <p className="flex min-h-20 min-w-40 items-center gap-2 rounded-2xl border border-dashed border-line bg-surface-2 px-3 py-2 text-xs text-muted">
        <ImageBrokenIcon size={20} className="shrink-0" aria-hidden />
        <span>
          <span className="block font-medium text-fg">{image.name}</span>
          Photo non visible depuis cet accès.
        </span>
      </p>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-2xl border border-line bg-surface-2">
      {/* Fichier de l'échange, servi après vérification de la session : pas d'optimisation d'image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={image.name} loading="lazy" onLoad={onLoad} onError={() => setFailed(true)} className="max-h-72 w-full min-w-28 object-cover" />
    </a>
  );
}

function FileLink({ file }: { file: Attachment }) {
  const { fileUrl } = usePlatform();
  return (
    <a
      href={fileUrl(file.id)}
      download={file.name}
      className="flex max-w-full items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5 transition-colors hover:border-accent"
    >
      <FileTypeIcon type={file.type} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-fg">{file.name}</span>
        <span className="block text-xs text-subtle">{formatBytes(file.size)}</span>
      </span>
      <DownloadSimpleIcon size={18} className="ml-1 shrink-0 text-subtle" aria-label="Télécharger" />
    </a>
  );
}

function DeleteMessage({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const { actions } = usePlatform();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  const remove = () =>
    start(async () => {
      const result = await actions.deleteMessage(id);
      if (!result.ok) {
        toast(result.message ?? "Suppression impossible.", "error");
        return;
      }
      setConfirming(false);
      onDeleted();
    });

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs text-subtle opacity-70 transition-opacity hover:text-danger hover:opacity-100 focus-visible:opacity-100"
      >
        <TrashIcon size={13} aria-hidden />
        Supprimer
      </button>
    );
  }
  return (
    <p className="flex items-center gap-2 text-xs text-muted" role="group" aria-label="Confirmer la suppression">
      Supprimer ce message ?
      <button type="button" onClick={remove} disabled={pending} className="font-semibold text-danger hover:underline disabled:opacity-50">
        {pending ? "Suppression…" : "Oui"}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="font-medium hover:underline">
        Non
      </button>
    </p>
  );
}

/** Texte du message : liens https cliquables et @mentions mises en valeur (jamais de HTML brut). */
function RichText({ text, mine }: { text: string; mine: boolean }) {
  return (
    <>
      {splitMessageText(text).map((part, index) =>
        part.kind === "link" ? (
          <a key={index} href={part.value} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            {part.value}
          </a>
        ) : part.kind === "mention" ? (
          <strong key={index} className={mine ? "font-semibold" : "font-semibold text-accent-ink"}>
            {part.value}
          </strong>
        ) : (
          part.value
        ),
      )}
    </>
  );
}

/** Réactions déjà posées, et la liste pour en ajouter une. */
function Reactions({ row, onChanged }: { row: MessageRow; onChanged: () => void }) {
  const { actions } = usePlatform();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const toggle = (emoji: string) =>
    start(async () => {
      await actions.toggleReaction({ id: row.id, emoji });
      setOpen(false);
      onChanged();
    });

  return (
    <div className={`flex flex-wrap items-center gap-1 ${row.mine ? "justify-end" : ""}`}>
      {row.reactionList.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          disabled={pending}
          onClick={() => toggle(reaction.emoji)}
          title={reaction.names.join(", ")}
          aria-pressed={reaction.mine}
          aria-label={`${reaction.emoji} ${reaction.count} : ${reaction.names.join(", ")}`}
          className={`flex h-6 items-center gap-1 rounded-full border px-2 text-xs transition-colors ${
            reaction.mine ? "border-accent bg-accent-soft text-accent-ink" : "border-line bg-surface text-muted hover:border-fg/40"
          }`}
        >
          <span aria-hidden>{reaction.emoji}</span>
          {reaction.count}
        </button>
      ))}
      {open ? (
        <span role="group" aria-label="Choisir une réaction" className="flex items-center gap-0.5 rounded-full border border-line bg-surface px-1">
          {REACTIONS.map((emoji) => (
            <button key={emoji} type="button" disabled={pending} onClick={() => toggle(emoji)} aria-label={`Réagir ${emoji}`} className="grid size-7 place-items-center rounded-full text-base hover:bg-surface-2">
              {emoji}
            </button>
          ))}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid size-6 place-items-center rounded-full text-subtle opacity-70 hover:bg-surface-2 hover:text-fg hover:opacity-100 focus-visible:opacity-100"
          aria-label="Ajouter une réaction"
        >
          <SmileyIcon size={15} aria-hidden />
        </button>
      )}
    </div>
  );
}

function PinButton({ row, onChanged }: { row: MessageRow; onChanged: () => void }) {
  const { actions } = usePlatform();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await actions.togglePin(row.id);
          if (!result.ok) toast(result.message ?? "Action impossible.", "error");
          onChanged();
        })
      }
      className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs text-subtle opacity-70 transition-opacity hover:text-fg hover:opacity-100 focus-visible:opacity-100"
    >
      <PushPinIcon size={13} aria-hidden />
      {row.pinned ? "Désépingler" : "Épingler"}
    </button>
  );
}
