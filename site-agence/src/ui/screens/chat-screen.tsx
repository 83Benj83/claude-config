"use client";

import { MagnifyingGlassIcon, PaperclipIcon, PushPinIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizeText } from "@/lib/establishments";
import { firstName } from "@/lib/format";
import type { MessageRow, MessagesView } from "@/lib/views";
import { Composer } from "../chat/composer";
import { MessageList } from "../chat/message-list";
import { markChatSeen } from "../chat/unread";
import { usePlatform } from "../platform";
import { controlClasses } from "../primitives/field";
import { Card, ScreenHeader } from "../primitives/surface";

/** Nouveaux messages demandés toutes les 4 secondes tant que l'écran est visible. */
const POLL_MS = 4000;

type Filter = "all" | "files";

/**
 * Échange : la discussion de l'équipe, rangée par salons (général, prospection,
 * contrats…), avec réponses, réactions, messages épinglés, recherche et fichiers.
 */
export function ChatScreen({ view }: { view: MessagesView }) {
  const { actions, me } = usePlatform();
  const [channel, setChannel] = useState(view.channel);
  const [polled, setPolled] = useState<MessagesView | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [replyTo, setReplyTo] = useState<MessageRow | null>(null);

  // La vue la plus récente du salon affiché l'emporte : celle du serveur ou celle qu'on vient de demander.
  const candidate = polled && polled.channel === channel ? polled : null;
  const initial = view.channel === channel ? view : null;
  const current = candidate && (!initial || candidate.loadedAt > initial.loadedAt) ? candidate : (initial ?? candidate);

  const refreshNow = useCallback(() => {
    actions.listMessages(channel).then(
      (next) => next && setPolled(next),
      () => undefined,
    );
  }, [actions, channel]);

  // Changement de salon : chargement immédiat, puis toutes les 4 secondes.
  useEffect(() => {
    refreshNow();
    const timer = setInterval(() => document.visibilityState === "visible" && refreshNow(), POLL_MS);
    return () => clearInterval(timer);
  }, [refreshNow]);

  const latestAt = current?.messages.at(-1)?.createdAt;
  useEffect(() => {
    if (me && latestAt) markChatSeen(me.id, latestAt);
  }, [me, latestAt]);

  const needle = normalizeText(query);
  const shown = useMemo(() => {
    const rows = current?.messages ?? [];
    return rows.filter((row) => {
      if (filter === "files" && row.attachments.length === 0) return false;
      return !needle || normalizeText(`${row.text} ${row.authorName} ${row.attachments.map((a) => a.name).join(" ")}`).includes(needle);
    });
  }, [current, filter, needle]);

  const channels = view.channels;
  const active = channels.find((entry) => entry.id === channel) ?? channels[0];
  const filtering = needle !== "" || filter !== "all";

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader title="Échange" description="La discussion de l'équipe, rangée par salons : tout le monde voit tout, en direct." />

      <div role="tablist" aria-label="Salons" className="flex gap-2 overflow-x-auto pb-1">
        {channels.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={entry.id === channel}
            onClick={() => {
              setChannel(entry.id);
              setReplyTo(null);
              setQuery("");
              setFilter("all");
            }}
            className={`h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors ${
              entry.id === channel ? "border-accent bg-accent-soft text-accent-ink" : "border-line-input bg-surface text-muted hover:text-fg"
            }`}
          >
            # {entry.label}
          </button>
        ))}
      </div>

      <Card className="flex h-[max(24rem,calc(100dvh-20rem))] flex-col overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5 sm:px-5">
          <p className="min-w-0 flex-1 truncate text-sm text-muted">
            <strong className="font-semibold text-fg"># {active.label}</strong> · {active.description}
          </p>
          <div className="relative w-full sm:w-56">
            <MagnifyingGlassIcon size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher"
              aria-label="Rechercher dans le salon"
              className={`${controlClasses} h-9 pl-9`}
            />
          </div>
          <button
            type="button"
            aria-pressed={filter === "files"}
            onClick={() => setFilter(filter === "files" ? "all" : "files")}
            className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors ${
              filter === "files" ? "border-accent bg-accent-soft text-accent-ink" : "border-line-input bg-surface text-muted hover:text-fg"
            }`}
          >
            <PaperclipIcon size={15} aria-hidden />
            Fichiers
          </button>
        </div>

        {current && current.pinned.length > 0 && !filtering && <PinnedBar pinned={current.pinned} />}

        <MessageList
          messages={shown}
          onChanged={refreshNow}
          onReply={setReplyTo}
          canPin={current?.canPin ?? false}
          emptyText={filtering ? "Aucun message ne correspond." : undefined}
        />
        <Composer
          channel={channel}
          channelLabel={active.label}
          canPost={active.canPost}
          replyTo={replyTo ? { id: replyTo.id, authorName: firstName(replyTo.authorName), text: replyTo.text || "Pièce jointe" } : null}
          onCancelReply={() => setReplyTo(null)}
          onSent={refreshNow}
        />
      </Card>
    </div>
  );
}

/** Messages épinglés par les admins : toujours visibles en haut du salon (repliables). */
function PinnedBar({ pinned }: { pinned: MessageRow[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-line bg-gold-soft/60 px-3 py-2 sm:px-5">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex w-full items-center gap-2 text-left text-xs font-semibold text-gold-ink">
        <PushPinIcon size={14} weight="fill" aria-hidden />
        {pinned.length} message{pinned.length > 1 ? "s" : ""} épinglé{pinned.length > 1 ? "s" : ""}
        <span className="ml-auto font-normal">{open ? "Masquer" : "Afficher"}</span>
      </button>
      {open && (
        <ul className="mt-1.5 flex max-h-28 flex-col gap-1 overflow-y-auto">
          {pinned.map((row) => (
            <li key={row.id} className="truncate text-sm text-fg">
              <span className="font-semibold">{firstName(row.authorName)}</span> : {row.text || "Pièce jointe"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

