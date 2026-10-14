"use client";

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

const withInPageLinks = (html: string) =>
  html.includes("</body>") ? html.replace("</body>", `${IN_PAGE_LINKS}</body>`) : `${html}${IN_PAGE_LINKS}`;

/**
 * Guide du prospecteur : la page d'origine affichée telle quelle, en plein
 * écran sous la barre du haut (le bouton « Menu » reste accessible).
 *
 * Cadre isolé : les styles du guide ne touchent pas ceux de l'espace, et
 * inversement. Les liens externes du guide s'ouvrent dans un nouvel onglet.
 */
export function GuideScreen({ html }: { html: string }) {
  return (
    <iframe
      title="Guide du prospecteur"
      srcDoc={withInPageLinks(html)}
      className="fixed inset-x-0 top-16 z-30 block h-[calc(100dvh-4rem)] w-full border-0 bg-[#f6f5fa]"
    />
  );
}
