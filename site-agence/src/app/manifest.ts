import type { MetadataRoute } from "next";
import { site } from "@/config/site";

/** L'espace équipe s'installe sur le téléphone comme une application (« Ajouter à l'écran d'accueil »). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${site.name} · ${site.space}`,
    short_name: site.name,
    description: site.description,
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f5fa",
    theme_color: "#17151f",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/app-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/app-icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "À contacter", url: "/a-contacter" },
      { name: "Rappels", url: "/rappels" },
      { name: "Prospecter", url: "/prospection" },
    ],
  };
}
