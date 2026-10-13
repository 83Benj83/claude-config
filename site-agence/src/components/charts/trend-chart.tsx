"use client";

import { useState } from "react";
import { formatDayShort } from "@/lib/dates";
import { formatInt } from "@/lib/format";

type Point = { date: string; total: number };

/**
 * Histogramme d'une seule série (prospections de l'équipe par jour).
 * Barres fines à bout arrondi, valeur au survol ou au focus, extrêmes étiquetés.
 */
export function TrendChart({ points, label }: { points: Point[]; label: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.total));
  const peak = points.reduce((best, p, i) => (p.total > points[best].total ? i : best), 0);
  const last = points.length - 1;
  const shown = active ?? last;

  return (
    <figure className="flex h-full flex-col">
      <figcaption className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium text-fg">{label}</span>
        <span className="text-sm text-muted" aria-live="polite">
          <strong className="font-semibold text-fg tabular">{formatInt(points[shown]?.total ?? 0)}</strong>{" "}
          {points[shown] ? formatDayShort(points[shown].date) : ""}
        </span>
      </figcaption>

      <div className="relative mt-6 flex min-h-36 flex-1 items-end gap-[2px] border-b border-line" onPointerLeave={() => setActive(null)}>
        {points.map((point, index) => {
          const height = `${Math.max(point.total > 0 ? 3 : 0, (point.total / max) * 100)}%`;
          const isActive = index === shown;
          return (
            <button
              key={point.date}
              type="button"
              className="group relative flex h-full flex-1 cursor-default items-end justify-center outline-none"
              onPointerEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              aria-label={`${formatDayShort(point.date)} : ${point.total} prospections`}
            >
              {index === peak && point.total > 0 && (
                <span className="absolute -top-5 text-[0.6875rem] font-medium text-subtle tabular" aria-hidden>
                  {formatInt(point.total)}
                </span>
              )}
              <span
                aria-hidden
                className={`w-full max-w-6 rounded-t-[4px] transition-[opacity,background-color] duration-200 ${
                  isActive ? "bg-accent" : "bg-accent/45 group-hover:bg-accent/70"
                } group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-accent`}
                style={{ height }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[0.6875rem] text-subtle tabular" aria-hidden>
        <span>{points[0] ? formatDayShort(points[0].date) : ""}</span>
        <span>{points[last] ? formatDayShort(points[last].date) : ""}</span>
      </div>
    </figure>
  );
}
