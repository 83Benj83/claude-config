/**
 * Assemble la page publiée : le JavaScript et le CSS construits par Vite
 * sont intégrés dans un seul fichier HTML (aucune ressource externe hormis
 * les polices Google Fonts).
 *
 * - `<dossier>/page.html`  : contenu à publier (l'outil Artifact ajoute l'enveloppe du document) ;
 * - `<dossier>/local.html` : document complet, pour tester dans un navigateur.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, process.argv[2] ?? "dist");
const assets = readdirSync(join(dir, "assets"));
const read = (ext) => {
  const files = assets.filter((file) => file.endsWith(ext));
  if (files.length !== 1) throw new Error(`Un seul fichier ${ext} attendu, trouvé : ${files.join(", ") || "aucun"}`);
  return readFileSync(join(dir, "assets", files[0]), "utf8");
};

// `</script` dans le code fermerait la balise : on l'échappe (équivalent en JavaScript).
const js = read(".js").replaceAll("</script", "<\\/script");
const css = read(".css").replaceAll("</style", "<\\/style");

const fonts =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..700&family=Onest:wght@400..700&display=swap" rel="stylesheet">';

const page = `<title>Astrinova · Espace équipe</title>
${fonts}
<style>${css}</style>
<div id="app"></div>
<script type="module">${js}</script>
`;

writeFileSync(join(dir, "page.html"), page);
writeFileSync(
  join(dir, "local.html"),
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>${page}</body></html>`,
);
console.log(`page.html : ${(Buffer.byteLength(page) / 1024).toFixed(0)} Kio`);
