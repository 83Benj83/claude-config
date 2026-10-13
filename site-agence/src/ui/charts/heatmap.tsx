"use client";

import { Avatar } from "@/ui/primitives/avatar";
import { formatDayShort, isWeekend } from "@/lib/dates";
import { firstName } from "@/lib/format";
import type { MonthReport } from "@/lib/stats";

const STEPS = 5;

/** Marche de la rampe (0 = aucune prospection, 1 à 5 = du plus clair au plus soutenu). */
function heatStep(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.min(STEPS, Math.floor((value / max) * STEPS) + 1);
}

/**
 * Calendrier d'activité membre × jour : un tableau dont chaque case affiche
 * son nombre, la couleur renforce la lecture. Lisible au clavier, au toucher
 * et par les lecteurs d'écran, sans dépendre du survol.
 */
export function Heatmap({ report, lastDay }: { report: MonthReport; lastDay: string }) {
  const max = Math.max(0, ...report.rows.flatMap((row) => row.daily));

  return (
    <figure>
      <div className="relative overflow-x-auto pb-2">
        <table className="w-max border-separate border-spacing-[2px] text-[0.625rem]">
          <caption className="sr-only">Prospections par personne et par jour</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-surface pr-3 text-left">
                <span className="sr-only">Membre</span>
              </th>
              {report.days.map((day) => (
                <th
                  key={day}
                  scope="col"
                  className={`w-7 min-w-7 pb-1 text-center text-xs tabular ${isWeekend(day) ? "font-normal text-subtle" : "font-medium text-muted"}`}
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
                <th scope="row" className="sticky left-0 z-10 bg-surface pr-3 text-left text-xs font-medium text-fg">
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <Avatar member={row.member} size="xs" />
                    {firstName(row.member.fullName)}
                  </span>
                </th>
                {row.daily.map((value, index) => {
                  const day = report.days[index];
                  if (day > lastDay) {
                    return (
                      <td key={day} className="p-0">
                        <span className="block size-7 rounded-[5px] border border-dashed border-line">
                          <span className="sr-only">à venir</span>
                        </span>
                      </td>
                    );
                  }
                  const step = heatStep(value, max);
                  return (
                    <td key={day} className="p-0">
                      <span
                        title={`${row.member.fullName}, ${formatDayShort(day)} : ${value}`}
                        className={`heat ${step > 0 ? `heat-${step}` : ""} grid size-7 place-items-center rounded-[5px] font-medium tabular`}
                      >
                        {value > 0 ? value : <span className="sr-only">0</span>}
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
          {Array.from({ length: STEPS + 1 }, (_, step) => (
            <span key={step} className={`heat ${step > 0 ? `heat-${step}` : ""} size-3.5 rounded-[4px]`} />
          ))}
        </span>
        Plus
      </figcaption>
    </figure>
  );
}
