"use client";

import { XIcon } from "@phosphor-icons/react";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Panneau modal (édition d'un identifiant, d'une ressource, menu principal).
 * `<dialog>` natif : piège du focus, Échap et arrière-plan inerte fournis par
 * le navigateur.
 * - `right` : panneau latéral sur grand écran, feuille du bas sur téléphone ;
 * - `bottom` : feuille du bas ;
 * - `left` : tiroir pleine hauteur à gauche, sur tous les écrans (menu).
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = "right",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Zone fixe sous le contenu défilant. */
  footer?: ReactNode;
  side?: "right" | "bottom" | "left";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const placement = {
    bottom: "sheet-bottom mt-auto mb-0 w-full max-w-[100vw] max-h-[92dvh] rounded-t-3xl",
    right:
      "sheet-right mt-auto mb-0 w-full max-w-[100vw] max-h-[92dvh] rounded-t-3xl md:my-0 md:mr-0 md:ml-auto md:h-dvh md:max-h-dvh md:w-[28rem] md:rounded-none md:rounded-l-3xl",
    left: "sheet-from-left my-0 mr-auto ml-0 h-dvh max-h-dvh w-[min(22rem,calc(100vw-3rem))] max-w-none rounded-r-3xl",
  }[side];
  const height = side === "left" ? "h-full" : "max-h-[92dvh] md:max-h-dvh";

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
      className={`${placement} overflow-hidden border border-line bg-surface p-0 text-fg shadow-pop backdrop:bg-[rgb(0_0_0/0.45)] backdrop:backdrop-blur-[2px]`}
    >
      {open && (
        <div className={`flex flex-col ${height}`}>
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
              className="-my-1.5 -mr-2 grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
              aria-label="Fermer"
            >
              <XIcon size={20} aria-hidden />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:px-6">{children}</div>
          {footer && <div className="border-t border-line px-3 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
