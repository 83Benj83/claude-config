"use client";

import { useState, type KeyboardEvent } from "react";
import { formatDayShort } from "@/lib/dates";
import { formatInt } from "@/lib/format";

type Point = { date: string; total: number };

/**
 * Histogramme d'une seule série (prospections de l'équipe par jour).
 * Survol, toucher ou flèches du clavier affichent la valeur d'un jour ;
 * un tableau masqué donne toutes les valeurs aux lecteurs d'écran.
 */
export function TrendChart({ points, label }: { points: Point[]; label: string }) {
  const last = points.length - 1;
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.total));
  const peak = points.reduce((best, p, i) => (p.total > points[best].total ? i : best), 0);
  const shown = active ?? last;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = { ArrowLeft: shown - 1, ArrowRight: shown + 1, Home: 0, End: last };
    if (!(event.key in moves)) return;
    event.preventDefault();
    setActive(Math.min(last, Math.max(0, moves[event.key])));
  };

  return (
    <figure className="relative flex h-full flex-col">
      <figcaption className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium text-fg">{label}</span>
        <span className="shrink-0 text-sm text-muted" aria-hidden>
          <strong className="font-semibold text-fg tabular">{formatInt(points[shown]?.total ?? 0)}</strong>{" "}
          {points[shown] ? formatDayShort(points[shown].date) : ""}
        </span>
      </figcaption>

      <div
        role="group"
        tabIndex={0}
        aria-label={`${label}. Flèches gauche et droite pour parcourir les jours.`}
        onKeyDown={onKeyDown}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        className="relative mt-6 flex min-h-36 flex-1 items-end gap-[2px] rounded-sm border-b border-line"
      >
        {points.map((point, index) => {
          const height = `${Math.max(point.total > 0 ? 3 : 0, (point.total / max) * 100)}%`;
          const isActive = index === shown;
          return (
            <div
              key={point.date}
              aria-hidden
              className="relative flex h-full flex-1 items-end justify-center"
              onPointerEnter={() => setActive(index)}
              onPointerDown={() => setActive(index)}
            >
              {index === peak && point.total > 0 && (
                <span className="absolute -top-5 text-[0.6875rem] font-medium text-subtle tabular">{formatInt(point.total)}</span>
              )}
              <span
                className={`w-full max-w-6 rounded-t-[4px] transition-colors duration-200 ${isActive ? "bg-accent-ink" : "bg-accent"}`}
                style={{ height }}
              />
              {isActive && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-fg" />}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[0.6875rem] text-subtle tabular" aria-hidden>
        <span>{points[0] ? formatDayShort(points[0].date) : ""}</span>
        <span>{points[last] ? formatDayShort(points[last].date) : ""}</span>
      </div>

      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Jour</th>
            <th scope="col">Prospections</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <th scope="row">{formatDayShort(point.date)}</th>
              <td>{point.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
