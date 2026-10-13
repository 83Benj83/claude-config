"use client";

import { XIcon } from "@phosphor-icons/react";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Panneau modal (édition d'un identifiant, d'une ressource, menu « Plus »).
 * `<dialog>` natif : piège du focus, Échap et arrière-plan inerte fournis par
 * le navigateur. Panneau latéral sur grand écran, feuille du bas sur téléphone.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  side = "right",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  side?: "right" | "bottom";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const placement =
    side === "bottom"
      ? "sheet-bottom mt-auto mb-0 w-full max-w-[100vw] rounded-t-3xl"
      : "sheet-right mt-auto mb-0 w-full max-w-[100vw] rounded-t-3xl md:my-0 md:mr-0 md:ml-auto md:h-dvh md:max-h-dvh md:w-[28rem] md:rounded-none md:rounded-l-3xl";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Clic sur le fond (hors du panneau) : fermeture.
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="sheet-title"
      className={`${placement} max-h-[92dvh] overflow-hidden border border-line bg-surface p-0 text-fg shadow-pop backdrop:bg-[rgb(0_0_0/0.45)] backdrop:backdrop-blur-[2px]`}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col md:max-h-dvh">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 id="sheet-title" className="text-lg font-semibold tracking-tight">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-sm text-subtle">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
              aria-label="Fermer"
            >
              <XIcon size={20} aria-hidden />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:px-6">{children}</div>
        </div>
      )}
    </dialog>
  );
}
