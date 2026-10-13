import { Avatar } from "@/components/avatar";
import { formatDayShort, isWeekend } from "@/lib/dates";
import { firstName } from "@/lib/format";
import type { MonthReport } from "@/lib/stats";

/** Rampe séquentielle à une seule teinte (accent), du plus clair au plus soutenu. */
const RAMP = [20, 40, 60, 80, 100];

function cellColor(value: number, max: number): string | undefined {
  if (value <= 0 || max <= 0) return undefined;
  const step = Math.min(RAMP.length - 1, Math.floor((value / max) * RAMP.length));
  return `color-mix(in oklab, var(--accent) ${RAMP[step]}%, var(--surface))`;
}

/**
 * Calendrier d'activité membre × jour. Tableau sémantique : les valeurs sont
 * lues par les lecteurs d'écran et affichées au survol.
 */
export function Heatmap({ report, lastDay }: { report: MonthReport; lastDay: string }) {
  const max = Math.max(0, ...report.rows.flatMap((row) => row.daily));

  return (
    <figure>
      <div className="overflow-x-auto pb-2">
        <table className="w-max border-separate border-spacing-[2px] text-xs">
          <caption className="sr-only">Prospections par personne et par jour</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-surface pr-3 text-left font-medium text-subtle">
                <span className="sr-only">Membre</span>
              </th>
              {report.days.map((day) => (
                <th
                  key={day}
                  scope="col"
                  className={`w-6 min-w-6 pb-1 text-center font-normal tabular ${isWeekend(day) ? "text-subtle/60" : "text-subtle"}`}
                >
                  <span aria-hidden>{Number(day.slice(8))}</span>
                  <span className="sr-only">{formatDayShort(day)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => (
              <tr key={row.member.id}>
                <th scope="row" className="sticky left-0 z-10 bg-surface pr-3 text-left font-medium text-fg">
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <Avatar member={row.member} size="xs" />
                    {firstName(row.member.fullName)}
                  </span>
                </th>
                {row.daily.map((value, index) => {
                  const day = report.days[index];
                  const future = day > lastDay;
                  const label = `${row.member.fullName}, ${formatDayShort(day)} : ${value} prospection${value > 1 ? "s" : ""}`;
                  return (
                    <td key={day} className="p-0">
                      <span
                        title={future ? undefined : label}
                        className={`block size-6 rounded-[5px] transition-transform hover:scale-110 ${
                          future ? "border border-dashed border-line" : value > 0 ? "" : "bg-surface-2"
                        }`}
                        style={{ background: future ? undefined : cellColor(value, max) }}
                      >
                        <span className="sr-only">{future ? "à venir" : value}</span>
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="mt-4 flex items-center gap-2 text-xs text-subtle">
        Moins
        <span className="flex gap-[2px]" aria-hidden>
          <span className="size-3.5 rounded-[4px] bg-surface-2" />
          {RAMP.map((step) => (
            <span
              key={step}
              className="size-3.5 rounded-[4px]"
              style={{ background: `color-mix(in oklab, var(--accent) ${step}%, var(--surface))` }}
            />
          ))}
        </span>
        Plus
      </figcaption>
    </figure>
  );
}
