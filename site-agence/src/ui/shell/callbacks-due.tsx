"use client";

import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { usePlatform } from "../platform";

/*
 * Rappels à faire aujourd'hui ou en retard, pour toute l'équipe : une pastille
 * sur « Rappels » dans le menu et sur l'accueil. Relu à chaque changement de
 * page et toutes les minutes tant que l'onglet est visible.
 */
const CHECK_EVERY_MS = 60_000;

const CallbacksDueContext = createContext(0);

export function CallbacksDueProvider({ children }: { children: ReactNode }) {
  const { me, actions, pathname } = usePlatform();
  const [count, setCount] = useState(0);
  const meId = me?.id ?? null;

  useEffect(() => {
    if (!meId) return;
    let cancelled = false;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      actions.callbacksDue().then(
        (next) => !cancelled && setCount(next),
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

  return <CallbacksDueContext value={meId ? count : 0}>{children}</CallbacksDueContext>;
}

/** Nombre de rappels à faire aujourd'hui ou en retard. */
export const useCallbacksDue = () => use(CallbacksDueContext);

/** Pastille chiffrée : « 3 » avec, pour les lecteurs d'écran, « 3 rappels à faire aujourd'hui ». */
export function DueBadge({ id, count }: { id: string; count: number }) {
  return (
    <span id={id} className="tone-violet shrink-0 rounded-full bg-[var(--tone)] px-2 py-0.5 text-[0.6875rem] font-semibold text-white tabular-nums">
      <span aria-hidden>{count > 99 ? "99+" : count}</span>
      <span className="sr-only">
        {count} rappel{count > 1 ? "s" : ""} à faire aujourd&apos;hui
      </span>
    </span>
  );
}
