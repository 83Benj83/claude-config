"use client";

import { ArrowDownIcon, ArrowUpIcon, EqualsIcon } from "@phosphor-icons/react";
import { formatInt } from "@/lib/format";

/** Variation par rapport à la période précédente : flèche + valeur, jamais la couleur seule. */
export function Delta({ value, label }: { value: number; label: string }) {
  const Icon = value > 0 ? ArrowUpIcon : value < 0 ? ArrowDownIcon : EqualsIcon;
  const tone = value > 0 ? "text-success" : value < 0 ? "text-danger" : "text-subtle";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium tabular ${tone}`} title={label}>
      <Icon size={12} weight="bold" aria-hidden />
      {value === 0 ? null : formatInt(Math.abs(value))}
      <span className="sr-only"> {label}</span>
    </span>
  );
}
