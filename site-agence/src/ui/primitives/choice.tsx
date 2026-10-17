"use client";

import { useId, type ReactNode } from "react";

type Option<T extends string> = { value: T; label: string; icon?: ReactNode; badge?: ReactNode };

/**
 * Choix unique présenté en pastilles (moyen de contact, jour…). Groupe de
 * boutons radio natifs : flèches du clavier, lecteurs d'écran, sans JS spécial.
 */
export function ChipGroup<T extends string>({
  label,
  name,
  value,
  options,
  onChange,
  error,
  columns = "auto",
}: {
  label: string;
  name: string;
  value: T | "";
  options: Option<T>[];
  onChange: (value: T) => void;
  error?: string;
  columns?: "auto" | "grid";
}) {
  const id = useId();
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="mb-1.5 text-sm font-medium text-fg">{label}</legend>
      <div className={columns === "grid" ? "grid grid-cols-2 gap-2 sm:grid-cols-4" : "flex flex-wrap gap-2"}>
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={`relative flex h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-[background-color,border-color,color] duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] ${
                checked
                  ? "border-accent bg-accent-soft text-accent-ink"
                  : "border-line-input bg-surface text-muted hover:border-fg/40 hover:text-fg"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.icon}
              <span className="truncate">{option.label}</span>
              {option.badge}
            </label>
          );
        })}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Onglets segmentés (périodes, vues) : boutons avec `aria-pressed`, état local. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = "md",
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full self-start overflow-x-auto rounded-full border border-line bg-surface-2 p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`shrink-0 rounded-full font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-200 ${
              size === "sm" ? "h-8 px-3 text-[0.8125rem]" : "h-9 px-4 text-sm"
            } ${active ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
