"use client";

import { createContext, use, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import type { ChatStatus } from "@/lib/actions-contract";
import { usePlatform } from "../platform";

/*
 * Nouveaux messages dans l'échange : on compare le dernier message à ce que
 * cet appareil a déjà vu (mémorisé dans le navigateur, par membre).
 */
const SEEN_EVENT = "echange:vu";
const CHECK_EVERY_MS = 30_000;
const seenKey = (memberId: string) => `echange-vu:${memberId}`;

function readSeen(memberId: string): string | null {
  try {
    return localStorage.getItem(seenKey(memberId));
  } catch {
    return null;
  }
}

/** Appelé par l'écran Échange : tout ce qui est affiché est lu. */
export function markChatSeen(memberId: string, at: string) {
  try {
    const previous = localStorage.getItem(seenKey(memberId));
    if (!previous || previous < at) localStorage.setItem(seenKey(memberId), at);
  } catch {
    // Stockage indisponible : l'indicateur restera affiché, sans autre gêne.
  }
  window.dispatchEvent(new Event(SEEN_EVENT));
}

function subscribeSeen(onChange: () => void) {
  window.addEventListener(SEEN_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SEEN_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const ChatUnreadContext = createContext(false);

export function ChatUnreadProvider({ children }: { children: ReactNode }) {
  const { me, actions, pathname } = usePlatform();
  const [status, setStatus] = useState<ChatStatus | null>(null);
  const meId = me?.id ?? null;
  const seen = useSyncExternalStore(
    subscribeSeen,
    () => (meId ? readSeen(meId) : null),
    () => null,
  );

  useEffect(() => {
    if (!meId) return;
    let cancelled = false;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      actions.chatStatus().then(
        (next) => !cancelled && setStatus(next),
        () => undefined,
      );
    };
    check();
    const timer = setInterval(check, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [meId, actions, pathname]);

  const unread = Boolean(meId && pathname !== "/echange" && status?.latestAt && status.latestAuthorId !== meId && (seen ?? "") < status.latestAt);
  return <ChatUnreadContext value={unread}>{children}</ChatUnreadContext>;
}

/** Vrai quand quelqu'un d'autre a écrit depuis la dernière visite de l'échange. */
export const useChatUnread = () => use(ChatUnreadContext);
