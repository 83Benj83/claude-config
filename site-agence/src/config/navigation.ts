/** Rubriques de l'application, regroupées par usage comme dans le menu latéral. */
import type { Tone } from "./site";

export type NavIcon =
  | "home"
  | "add"
  | "search"
  | "ranking"
  | "report"
  | "contracts"
  | "guide"
  | "resources"
  | "team"
  | "agency"
  | "admin";

export type NavItem = {
  href: string;
  label: string;
  short: string;
  icon: NavIcon;
  /** Couleur de la famille de rubriques (icône, onglet actif). */
  tone: Tone;
  /** Une phrase pour les tuiles de l'accueil et le menu « Plus ». */
  hint: string;
  adminOnly?: boolean;
};

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Au quotidien",
    items: [
      { href: "/", label: "Accueil", short: "Accueil", icon: "home", tone: "violet", hint: "Ta journée et celle de l'équipe" },
      { href: "/prospection", label: "Prospecter", short: "Prospecter", icon: "add", tone: "violet", hint: "Ajouter un commerce contacté" },
      { href: "/recherche", label: "Déjà contacté ?", short: "Recherche", icon: "search", tone: "violet", hint: "Vérifier avant d'appeler" },
    ],
  },
  {
    title: "Résultats",
    items: [
      { href: "/classement", label: "Classement", short: "Classement", icon: "ranking", tone: "gold", hint: "Jour, semaine et mois" },
      { href: "/bilan", label: "Bilan du mois", short: "Bilan", icon: "report", tone: "gold", hint: "Totaux, calendrier, export" },
      { href: "/contrats", label: "Contrats", short: "Contrats", icon: "contracts", tone: "gold", hint: "En cours et effectués" },
    ],
  },
  {
    title: "Ressources",
    items: [
      { href: "/guide", label: "Guide du prospecteur", short: "Guide", icon: "guide", tone: "mint", hint: "Packs, messages, objections" },
      { href: "/ressources", label: "Mails et liens", short: "Liens", icon: "resources", tone: "mint", hint: "À copier en un geste" },
    ],
  },
  {
    title: "Équipe",
    items: [
      { href: "/equipe", label: "Organigramme", short: "Équipe", icon: "team", tone: "coral", hint: "Qui fait quoi" },
      { href: "/agence", label: "L'agence", short: "Agence", icon: "agency", tone: "coral", hint: "Astrinova en bref" },
    ],
  },
  {
    title: "Administration",
    items: [{ href: "/admin", label: "Panel admin", short: "Admin", icon: "admin", tone: "violet", hint: "Identifiants et statistiques", adminOnly: true }],
  },
];

const byHref = (href: string) => NAV_GROUPS.flatMap((group) => group.items).find((item) => item.href === href)!;

/** Barre du bas sur téléphone : 4 rubriques + « Plus », le bouton central ajoute un prospect. */
export const MOBILE_TABS: NavItem[] = [byHref("/"), byHref("/recherche"), byHref("/prospection"), byHref("/classement")];

export const allNavItems = (isAdmin: boolean) =>
  NAV_GROUPS.flatMap((group) => group.items).filter((item) => isAdmin || !item.adminOnly);

export const navItem = byHref;
