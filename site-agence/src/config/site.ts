/**
 * Contenu éditorial du site. Tout ce qui décrit l'agence se modifie ici :
 * nom, textes de présentation, services, méthode et valeurs.
 */

export type IconName =
  | "browser"
  | "storefront"
  | "magnifying-glass"
  | "wrench"
  | "target"
  | "chat"
  | "handshake"
  | "rocket";

export const site = {
  name: "Atelier Vif",
  monogram: "AV",
  tagline: "Agence de création de sites web",
  description:
    "L'espace interne de l'équipe Atelier Vif\u00a0: l'agence, l'organigramme, le guide de prospection et le classement.",

  hero: {
    title: "On crée des sites qui ramènent des clients.",
    subtitle:
      "Ici, tout ce qu'il faut pour prospecter\u00a0: l'équipe, la méthode, et le classement mis à jour chaque soir.",
  },

  about: {
    title: "Une agence petite, rapide, et qui livre.",
    body: "On conçoit, on développe et on fait vivre les sites web de commerces, d'artisans et de PME. Chaque projet démarre par une conversation\u00a0: c'est pour ça que la prospection est au cœur de l'agence.",
  },

  services: [
    {
      icon: "browser",
      title: "Sites vitrines",
      description: "Un site clair et rapide qui présente l'activité et donne envie d'appeler.",
    },
    {
      icon: "storefront",
      title: "E-commerce",
      description: "Une boutique en ligne simple à gérer, du catalogue au paiement.",
    },
    {
      icon: "magnifying-glass",
      title: "Refonte & SEO",
      description: "On reprend un site daté et on le fait remonter sur Google.",
    },
    {
      icon: "wrench",
      title: "Maintenance",
      description: "Mises à jour, sécurité et petites évolutions, au mois.",
    },
  ] satisfies { icon: IconName; title: string; description: string }[],

  method: [
    {
      icon: "target",
      verb: "Repérer",
      text: "Trouver les entreprises dont le site freine l'activité, ou qui n'en ont pas.",
    },
    {
      icon: "chat",
      verb: "Contacter",
      text: "Un premier message court et personnalisé, puis des relances régulières.",
    },
    {
      icon: "handshake",
      verb: "Proposer",
      text: "Un rendez-vous, une maquette rapide, un devis clair.",
    },
    {
      icon: "rocket",
      verb: "Livrer",
      text: "La production prend le relais et on garde le lien après la mise en ligne.",
    },
  ] satisfies { icon: IconName; verb: string; text: string }[],

  values: [
    {
      title: "Le volume crée la chance.",
      text: "Chaque journée de prospection compte, même celles sans réponse.",
    },
    {
      title: "On joue collectif.",
      text: "Le classement motive, mais on partage les bons messages et les bonnes pistes.",
    },
    {
      title: "On dit ce qu'on fait.",
      text: "Des chiffres honnêtes, des promesses tenues, des clients qui reviennent.",
    },
  ],

  closing: {
    title: "Ta journée compte.",
    text: "Note tes prospections avant de partir\u00a0: trente secondes, et le classement de l'équipe est à jour.",
  },
} as const;

export const navigation = [
  { href: "/", label: "Accueil" },
  { href: "/equipe", label: "Équipe" },
  { href: "/guide", label: "Guide" },
  { href: "/classement", label: "Classement" },
  { href: "/bilan", label: "Bilan" },
] as const;
