"use client";

import { ListIcon, XIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId } from "react";
import { navigation } from "@/config/site";
import { isActivePath } from "./nav-links";
import { useDisclosure } from "./use-disclosure";

/** Zones de la page rendues inertes pendant que le menu plein écran est ouvert. */
const BACKGROUND_SELECTORS = ["#contenu", "footer", "[data-page-notice]"];

/** Menu plein écran sous le header, pour les petits écrans (comportement modal). */
export function MobileNav() {
  const pathname = usePathname();
  const { open, toggle, close, triggerRef, rootRef } = useDisclosure();
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const background = BACKGROUND_SELECTORS.flatMap((selector) => [...document.querySelectorAll<HTMLElement>(selector)]);
    background.forEach((element) => element.setAttribute("inert", ""));
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      background.forEach((element) => element.removeAttribute("inert"));
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div ref={rootRef} className="md:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        className="grid size-10 place-items-center rounded-full text-fg transition-colors hover:bg-surface-2"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
      >
        {open ? <XIcon size={20} aria-hidden /> : <ListIcon size={20} aria-hidden />}
      </button>

      {open && (
        <nav
          id={panelId}
          aria-label="Navigation principale"
          className="fixed inset-x-0 top-16 bottom-0 z-50 overflow-y-auto border-t border-line bg-bg px-4 pt-4 pb-10"
        >
          <ul className="flex flex-col gap-1">
            {navigation.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => close()}
                    className={`flex h-14 items-center rounded-2xl px-4 text-lg font-medium tracking-tight ${
                      active ? "bg-surface-2 text-fg" : "text-muted"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
