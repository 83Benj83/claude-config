"use client";

import { useCallback, useEffect, useState } from "react";
import type { MessagesView } from "@/lib/views";
import { Composer } from "../chat/composer";
import { MessageList } from "../chat/message-list";
import { markChatSeen } from "../chat/unread";
import { usePlatform } from "../platform";
import { Card, ScreenHeader } from "../primitives/surface";

/** Nouveaux messages demandés toutes les 4 secondes tant que l'écran est visible. */
const POLL_MS = 4000;

/** Échange : la discussion de toute l'équipe, avec photos et fichiers. */
export function ChatScreen({ view }: { view: MessagesView }) {
  const { actions, me } = usePlatform();
  const [polled, setPolled] = useState<MessagesView | null>(null);
  // La vue la plus récente l'emporte : celle du serveur (ou de la base de l'aperçu) ou celle qu'on vient de demander.
  const current = polled && polled.loadedAt > view.loadedAt ? polled : view;

  const refreshNow = useCallback(() => {
    actions.listMessages().then(
      (next) => next && setPolled(next),
      () => undefined,
    );
  }, [actions]);

  useEffect(() => {
    const timer = setInterval(() => document.visibilityState === "visible" && refreshNow(), POLL_MS);
    return () => clearInterval(timer);
  }, [refreshNow]);

  const latestAt = current.messages.at(-1)?.createdAt;
  useEffect(() => {
    if (me && latestAt) markChatSeen(me.id, latestAt);
  }, [me, latestAt]);

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader title="Échange" description="Messages, photos et fichiers de l'équipe : tout le monde voit tout, en direct." />
      <Card className="flex h-[max(24rem,calc(100dvh-18rem))] flex-col overflow-hidden">
        <MessageList messages={current.messages} onChanged={refreshNow} />
        <Composer onSent={refreshNow} />
      </Card>
    </div>
  );
}
