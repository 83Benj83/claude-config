"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTheme } from "../shell/theme-toggle";

/**
 * Dans un cadre `srcdoc`, un lien « #section » vise l'adresse de la page qui
 * contient le cadre : au lieu de descendre à la section, le navigateur
 * chargerait le site dans le cadre (ce qu'il refuse). Ce script fait défiler
 * le guide jusqu'à la section, avec le défilement et les marges du guide.
 */
const IN_PAGE_LINKS = `<script>
document.addEventListener('click', function (e) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  var lien = e.target.closest('a[href^="#"]');
  if (!lien) return;
  e.preventDefault();
  var cible = document.getElementById(decodeURIComponent(lien.getAttribute('href').slice(1)));
  if (cible) cible.scrollIntoView();
});
</script>`;

/**
 * Le guide a son propre thème sombre (`data-theme` sur sa racine). Ce script,
 * lu avant le contenu, reprend dès l'ouverture le thème choisi dans l'espace :
 * pas d'éclair clair quand l'espace est en sombre.
 */
const SAME_THEME = `<script>
try { var t = parent.document.documentElement.getAttribute('data-theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) {}
</script>`;

const prepare = (html: string) => {
  const withTheme = html.includes("</head>") ? html.replace("</head>", `${SAME_THEME}</head>`) : `${SAME_THEME}${html}`;
  return withTheme.includes("</body>") ? withTheme.replace("</body>", `${IN_PAGE_LINKS}</body>`) : `${withTheme}${IN_PAGE_LINKS}`;
};

/**
 * Guide du prospecteur : la page d'origine affichée telle quelle, en plein
 * écran sous la barre du haut (le bouton « Menu » reste accessible).
 *
 * Cadre isolé : les styles du guide ne touchent pas ceux de l'espace, et
 * inversement. Les liens externes du guide s'ouvrent dans un nouvel onglet.
 * Le guide suit le thème clair / sombre de l'espace, même changé en cours de lecture.
 */
export function GuideScreen({ html }: { html: string }) {
  const theme = useTheme();
  const frame = useRef<HTMLIFrameElement>(null);

  const syncTheme = useCallback(() => {
    const root = frame.current?.contentDocument?.documentElement;
    if (!root || theme === null) return;
    const chosen = document.documentElement.getAttribute("data-theme");
    if (chosen) root.setAttribute("data-theme", chosen);
    else root.removeAttribute("data-theme");
  }, [theme]);

  useEffect(syncTheme, [syncTheme]);

  return (
    <iframe
      ref={frame}
      title="Guide du prospecteur"
      srcDoc={prepare(html)}
      onLoad={syncTheme}
      className="fixed inset-x-0 top-16 z-30 block h-[calc(100dvh-4rem)] w-full border-0 bg-bg"
    />
  );
}
