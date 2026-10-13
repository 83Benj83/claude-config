/** Rubriques de l'application, regroupées comme dans le menu latéral. */

export type NavIcon =
  | "home"
  | "add"
  | "search"
  | "ranking"
  | "report"
  | "team"
  | "resources"
  | "agency"
  | "admin";

export type NavItem = { href: string; label: string; short: string; icon: NavIcon; adminOnly?: boolean };

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Prospection",
    items: [
      { href: "/", label: "Accueil", short: "Accueil", icon: "home" },
      { href: "/prospection", label: "Prospecter", short: "Prospecter", icon: "add" },
      { href: "/recherche", label: "Déjà contacté ?", short: "Recherche", icon: "search" },
      { href: "/classement", label: "Classement", short: "Classement", icon: "ranking" },
      { href: "/bilan", label: "Bilan du mois", short: "Bilan", icon: "report" },
    ],
  },
  {
    title: "Équipe",
    items: [
      { href: "/equipe", label: "Organigramme", short: "Équipe", icon: "team" },
      { href: "/ressources", label: "Mails et liens", short: "Ressources", icon: "resources" },
      { href: "/agence", label: "L'agence", short: "Agence", icon: "agency" },
    ],
  },
  {
    title: "Administration",
    items: [{ href: "/admin", label: "Identifiants", short: "Gestion", icon: "admin", adminOnly: true }],
  },
];

/** Barre du bas sur téléphone : 4 rubriques + « Plus », le bouton central ajoute un prospect. */
export const MOBILE_TABS: NavItem[] = [
  { href: "/", label: "Accueil", short: "Accueil", icon: "home" },
  { href: "/recherche", label: "Déjà contacté ?", short: "Recherche", icon: "search" },
  { href: "/prospection", label: "Prospecter", short: "Ajouter", icon: "add" },
  { href: "/classement", label: "Classement", short: "Classement", icon: "ranking" },
];

export const allNavItems = (isAdmin: boolean) =>
  NAV_GROUPS.flatMap((group) => group.items).filter((item) => isAdmin || !item.adminOnly);
