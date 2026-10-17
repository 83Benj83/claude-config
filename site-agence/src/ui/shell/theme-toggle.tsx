"use client";

import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

function readTheme(): Theme {
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit === "light" || explicit === "dark") return explicit;
  return darkQuery().matches ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const query = darkQuery();
  query.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    query.removeEventListener("change", onChange);
  };
}

export function toggleTheme() {
  const next = readTheme() === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem("theme", next);
  } catch {
    // Stockage indisponible (navigation privée) : le choix vaut pour la session.
  }
}

/** Thème affiché ; `null` tant que le navigateur n'a pas répondu (rendu serveur). */
export function useTheme(): Theme | null {
  return useSyncExternalStore<Theme | null>(subscribe, readTheme, () => null);
}

/** Libellé du thème à venir. */
export function useNextThemeLabel(): string {
  const theme = useTheme();
  return theme === null ? "Changer de thème" : theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre";
}

/** Bouton icône clair / sombre ; les deux icônes sont rendues, le CSS affiche la bonne. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const label = useNextThemeLabel();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg ${className}`}
      aria-label={label}
      title={label}
    >
      <SunIcon size={19} className="theme-icon-dark" aria-hidden />
      <MoonIcon size={19} className="theme-icon-light" aria-hidden />
    </button>
  );
}
