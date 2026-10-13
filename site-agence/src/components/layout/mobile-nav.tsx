"use client";

import { ListIcon, XIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { navigation } from "@/config/site";
import { isActivePath } from "./nav-links";

/** Menu plein écran sous le header, pour les petits écrans. */
export function MobileNav() {
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const panelId = useId();
  // Le menu se ferme dès que l'on change de page.
  const open = openedOn === pathname;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpenedOn(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpenedOn(open ? null : pathname)}
        className="grid size-9 place-items-center rounded-full text-fg transition-colors hover:bg-surface-2"
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
          className="fixed inset-x-0 top-16 bottom-0 z-50 border-t border-line bg-bg px-4 pt-4 pb-10"
        >
          <ul className="flex flex-col gap-1">
            {navigation.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpenedOn(null)}
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
