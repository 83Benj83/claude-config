"use client";

import { MoonIcon, SunIcon } from "@phosphor-icons/react";

function currentTheme(): "light" | "dark" {
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Bascule clair / sombre. Les deux icônes sont rendues et le CSS affiche la
 * bonne : aucun écart entre le rendu serveur et le navigateur.
 */
export function ThemeToggle() {
  const toggle = () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Stockage indisponible (navigation privée) : le choix vaut pour la session.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="group grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg"
      aria-label="Changer de thème (clair ou sombre)"
    >
      <SunIcon size={18} className="theme-icon-dark" aria-hidden />
      <MoonIcon size={18} className="theme-icon-light" aria-hidden />
    </button>
  );
}
