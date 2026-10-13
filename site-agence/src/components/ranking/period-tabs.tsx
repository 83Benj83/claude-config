import Link from "next/link";
import type { Period } from "@/lib/types";

export const PERIODS: { value: Period; label: string; comparison: string }[] = [
  { value: "jour", label: "Aujourd'hui", comparison: "par rapport à hier" },
  { value: "semaine", label: "Semaine", comparison: "par rapport au même moment la semaine dernière" },
  { value: "mois", label: "Mois", comparison: "par rapport au même moment le mois dernier" },
];

export function parsePeriod(value: unknown): Period {
  return PERIODS.some((period) => period.value === value) ? (value as Period) : "jour";
}

export function PeriodTabs({ active }: { active: Period }) {
  return (
    <nav aria-label="Période du classement">
      <ul className="inline-flex rounded-full border border-line bg-surface-2 p-1">
        {PERIODS.map((period) => {
          const isActive = period.value === active;
          return (
            <li key={period.value}>
              <Link
                href={period.value === "jour" ? "/classement" : `/classement?p=${period.value}`}
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-[background-color,color,box-shadow] duration-200 ${
                  isActive ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg"
                }`}
              >
                {period.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
