"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FocusEvent } from "react";

/**
 * État ouvert/fermé d'un menu déroulant :
 * - se ferme au changement de page (l'ouverture est liée à la page courante) ;
 * - Échap ferme et rend le focus au bouton ;
 * - un clic ou un focus en dehors ferme le menu.
 */
export function useDisclosure<T extends HTMLElement = HTMLButtonElement>() {
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const triggerRef = useRef<T>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = (restoreFocus = false) => {
    setOpenedOn(null);
    if (restoreFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenedOn(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenedOn(null);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return {
    open,
    toggle: () => setOpenedOn(open ? null : pathname),
    close,
    triggerRef,
    rootRef,
    /** À poser sur le conteneur : ferme quand le focus clavier en sort. */
    onBlurCapture: (event: FocusEvent<HTMLElement>) => {
      const next = event.relatedTarget as Node | null;
      if (next && !rootRef.current?.contains(next)) setOpenedOn(null);
    },
  };
}
