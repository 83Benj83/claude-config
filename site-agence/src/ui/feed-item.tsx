"use client";

import { channelLabel } from "@/lib/channels";
import { formatRelativeDay } from "@/lib/dates";
import type { Channel } from "@/lib/types";
import { ChannelIcon } from "./primitives/icon";

/** Ligne « établissement contacté » : nom, ville, moyen et date. */
export function ProspectLine({
  name,
  city,
  channel,
  date,
  today,
  by,
  trailing,
}: {
  name: string;
  city: string;
  channel: Channel;
  date: string;
  today: string;
  by?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted" title={channelLabel(channel)}>
        <ChannelIcon channel={channel} size={17} />
        <span className="sr-only">{channelLabel(channel)}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{name}</p>
        <p className="truncate text-xs text-subtle">
          {city}
          {by ? `, par ${by}` : ""}
        </p>
      </div>
      <span className="shrink-0 text-xs text-subtle">{formatRelativeDay(date, today)}</span>
      {trailing}
    </div>
  );
}
