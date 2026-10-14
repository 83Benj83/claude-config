import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Bricolage_Grotesque, Onest } from "next/font/google";
import { site } from "@/config/site";
import "./globals.css";

/** Polices de l'identité Astrinova, servies par le site lui-même (aucun appel à Google côté visiteur). */
const title = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-title", display: "swap" });
const body = Onest({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${site.name} · ${site.space}`, template: `%s · ${site.name}` },
  description: site.description,
  // Espace interne : ne doit pas apparaître dans les moteurs de recherche.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b10" },
  ],
};

/** Applique le thème choisi avant le premier rendu (évite le flash clair/sombre). */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${title.variable} ${body.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
