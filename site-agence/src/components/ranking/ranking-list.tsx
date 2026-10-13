import { FireIcon } from "@phosphor-icons/react/ssr";
import { Avatar } from "@/components/avatar";
import { formatInt } from "@/lib/format";
import type { RankingRow } from "@/lib/stats";
import { Delta } from "./delta";

type Props = {
  rows: RankingRow[];
  meId: string;
  comparison: string;
  /** Vue du jour : distingue « pas encore saisi » d'une vraie journée à 0. */
  flagMissing?: boolean;
};

/** Classement complet : rang, personne, barre proportionnelle et total. */
export function RankingList({ rows, meId, comparison, flagMissing = false }: Props) {
  const max = Math.max(1, ...rows.map((row) => row.total));

  return (
    <ol className="divide-y divide-line" aria-label="Classement complet">
      {rows.map((row) => {
        const isMe = row.member.id === meId;
        const width = `${Math.max(row.total > 0 ? 2 : 0, (row.total / max) * 100)}%`;
        return (
          <li
            key={row.member.id}
            aria-current={isMe ? "true" : undefined}
            className={`grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-3 py-3.5 sm:grid-cols-[2.5rem_1fr_auto] sm:px-5 ${
              isMe ? "bg-accent-soft" : ""
            }`}
          >
            <span className={`text-center text-sm font-semibold tabular ${row.rank <= 3 && row.total > 0 ? "text-fg" : "text-subtle"}`}>
              {row.rank}
            </span>

            <div className="flex min-w-0 items-center gap-3">
              <Avatar member={row.member} size="sm" highlight={isMe} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-[0.9375rem] font-medium text-fg">
                  <span className="truncate">{row.member.fullName}</span>
                  {isMe && (
                    <span className="shrink-0 rounded-full bg-inverse px-2 py-0.5 text-[0.6875rem] font-semibold text-on-inverse">
                      Toi
                    </span>
                  )}
                  {row.rank === 1 && row.total > 0 && (
                    <FireIcon size={16} weight="fill" className="shrink-0 text-accent" aria-label="En tête" />
                  )}
                </p>
                <div className="mt-1.5 h-2" aria-hidden>
                  <div
                    className="h-full origin-left rounded-r-[4px] bg-accent transition-[width] duration-700 ease-[var(--ease-out-expo)]"
                    style={{ width }}
                  />
                </div>
              </div>
            </div>

            {flagMissing && !row.hasEntry ? (
              <span className="text-right text-xs text-subtle">Pas encore saisi</span>
            ) : (
              <div className="flex flex-col items-end gap-0.5 text-right">
                <span className="text-lg font-semibold tracking-tight text-fg tabular">{formatInt(row.total)}</span>
                <Delta value={row.delta} label={`${formatInt(row.previousTotal)} ${comparison}`} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
