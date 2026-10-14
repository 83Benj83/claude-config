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
  TrashIcon,
} from "@phosphor-icons/react";
import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { formatBytes } from "@/lib/attachments";
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
export function MessageList({ messages, onChanged }: { messages: MessageRow[]; onChanged: () => void }) {
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
        <EmptyState icon={<ChatsCircleIcon size={22} aria-hidden />} title="Aucun message pour l'instant.">
          Écris le premier : toute l&apos;équipe le verra ici.
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
                <MessageItem key={row.id} row={row} continued={continued} onMediaLoad={scrollToBottom} onChanged={onChanged} />
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
}: {
  row: MessageRow;
  continued: boolean;
  onMediaLoad: () => void;
  onChanged: () => void;
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
        {row.text && (
          <p
            className={`rounded-2xl px-3.5 py-2 text-[0.9375rem] leading-relaxed break-words whitespace-pre-wrap ${
              row.mine ? "bg-accent text-on-accent" : "bg-surface-2 text-fg"
            }`}
          >
            {row.text}
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
        {row.canDelete && <DeleteMessage id={row.id} onDeleted={onChanged} />}
      </div>
    </li>
  );
}

function ImageLink({ image, onLoad }: { image: Attachment; onLoad: () => void }) {
  const { fileUrl } = usePlatform();
  const url = fileUrl(image.id);
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-2xl border border-line bg-surface-2">
      {/* Fichier de l'échange, servi après vérification de la session : pas d'optimisation d'image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={image.name} loading="lazy" onLoad={onLoad} className="max-h-72 w-full min-w-28 object-cover" />
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
