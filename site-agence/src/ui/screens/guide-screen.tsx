"use client";

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
      srcDoc={html}
      className="fixed inset-x-0 top-16 z-30 block h-[calc(100dvh-4rem)] w-full border-0 bg-[#f6f5fa]"
    />
  );
}
