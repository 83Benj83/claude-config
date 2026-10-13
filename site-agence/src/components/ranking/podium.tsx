"use client";

import { CrownSimpleIcon } from "@phosphor-icons/react";
import { m } from "motion/react";
import { MotionRoot } from "@/components/motion/motion-root";
import { Avatar } from "@/components/avatar";
import { firstName, formatInt, formatRank } from "@/lib/format";

export type PodiumPlace = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  total: number;
  rank: number;
  isMe: boolean;
};

/**
 * Le DOM suit l'ordre 1er, 2e, 3e (lecteurs d'écran) ; l'affichage met le 1er
 * au centre. Les hauteurs dépendent de la place, pas du score.
 */
const SLOTS = [
  { order: "order-2", height: "h-32 sm:h-40", compactHeight: "h-16", delay: 0.3 },
  { order: "order-1", height: "h-24 sm:h-28", compactHeight: "h-12", delay: 0.15 },
  { order: "order-3", height: "h-16 sm:h-20", compactHeight: "h-9", delay: 0 },
] as const;

const EASE = [0.16, 1, 0.3, 1] as const;

export function Podium({ places, compact = false }: { places: PodiumPlace[]; compact?: boolean }) {
  return (
    <MotionRoot>
      <ol className="grid grid-cols-3 items-end gap-2 sm:gap-3" aria-label="Podium">
        {SLOTS.map((slot, index) => {
          const place = places[index];
          const isLeader = place?.rank === 1;
          const blockTone = isLeader
            ? "bg-accent text-on-accent"
            : place
              ? "border border-b-0 border-line bg-surface-2 text-muted"
              : "border border-dashed border-b-0 border-line-strong text-subtle";
          return (
            <li key={index} className={`${slot.order} flex min-w-0 flex-col items-center`}>
              {place ? (
                <m.div
                  className="mb-3 flex min-w-0 max-w-full flex-col items-center text-center"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: slot.delay + 0.25, ease: EASE }}
                >
                  {isLeader && <CrownSimpleIcon size={22} weight="fill" className="mb-1 text-accent" aria-hidden />}
                  <Avatar member={place} size={compact ? "md" : index === 0 ? "xl" : "lg"} highlight={isLeader} />
                  <p className="mt-2 w-full truncate text-sm font-semibold text-fg">
                    {firstName(place.fullName)}
                    {place.isMe && <span className="font-normal text-subtle"> (toi)</span>}
                  </p>
                  <p className={`font-semibold tracking-tight text-fg ${compact ? "text-xl" : "text-2xl sm:text-3xl"}`}>
                    {formatInt(place.total)}
                  </p>
                  <span className="sr-only">
                    {formatRank(place.rank)} : {place.fullName}, {place.total} prospections
                  </span>
                </m.div>
              ) : (
                <p className="mb-3 text-center text-xs text-subtle">Place à prendre</p>
              )}
              <m.div
                aria-hidden
                className={`${compact ? slot.compactHeight : slot.height} ${blockTone} grid w-full origin-bottom place-items-start justify-center rounded-t-2xl pt-2 text-lg font-semibold`}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.7, delay: slot.delay, ease: EASE }}
              >
                {place?.rank ?? index + 1}
              </m.div>
            </li>
          );
        })}
      </ol>
    </MotionRoot>
  );
}
