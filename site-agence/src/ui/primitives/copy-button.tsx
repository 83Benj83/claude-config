"use client";

import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useToast } from "./toast";

/**
 * Copie dans le presse-papiers. Si le navigateur refuse (certaines vues
 * intégrées), le texte est sélectionné pour une copie manuelle.
 */
export function CopyButton({ text, label = "Copier", targetId, compact = false }: { text: string; label?: string; targetId?: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast("Copié dans le presse-papiers.");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const target = targetId ? document.getElementById(targetId) : null;
      if (target) {
        const range = document.createRange();
        range.selectNodeContents(target);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
      toast("Copie automatique impossible : le texte est sélectionné, copie-le à la main.", "error");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={compact ? label : undefined}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-line-input bg-surface text-sm font-medium text-fg transition-colors hover:bg-surface-2 active:scale-[0.98] ${
        compact ? "size-9" : "h-9 px-3.5"
      }`}
    >
      {copied ? <CheckIcon size={16} weight="bold" className="text-success" aria-hidden /> : <CopyIcon size={16} aria-hidden />}
      {!compact && (copied ? "Copié" : label)}
    </button>
  );
}
