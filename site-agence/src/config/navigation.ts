/** Rubriques de l'application, regroupées par usage comme dans le menu. */
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
  icon: NavIcon;
  /** Couleur de la famille de rubriques (icône, rubrique ouverte). */
  tone: Tone;
  /** Une phrase pour le menu et les rubriques de l'accueil. */
  hint: string;
  adminOnly?: boolean;
};

export type NavGroup = { title: string; items: NavItem[] };

export const HOME_ITEM: NavItem = { href: "/", label: "Accueil", icon: "home", tone: "violet", hint: "Retour au début" };

/** Toutes les rubriques, à égalité : l'ordre suit une journée de travail, rien n'est mis en avant. */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Prospection",
    items: [
      { href: "/prospection", label: "Prospecter", icon: "add", tone: "violet", hint: "Ajouter un commerce contacté" },
      { href: "/recherche", label: "Déjà contacté ?", icon: "search", tone: "violet", hint: "Vérifier avant d'appeler" },
    ],
  },
  {
    title: "Ressources",
    items: [
      { href: "/guide", label: "Guide du prospecteur", icon: "guide", tone: "mint", hint: "Packs, messages, objections" },
      { href: "/ressources", label: "Mails et liens", icon: "resources", tone: "mint", hint: "À copier en un geste" },
    ],
  },
  {
    title: "Suivi",
    items: [
      { href: "/contrats", label: "Contrats", icon: "contracts", tone: "gold", hint: "En cours et effectués" },
      { href: "/bilan", label: "Bilan du mois", icon: "report", tone: "gold", hint: "Totaux, calendrier, export" },
      { href: "/classement", label: "Classement", icon: "ranking", tone: "gold", hint: "Jour, semaine et mois" },
    ],
  },
  {
    title: "Équipe",
    items: [
      { href: "/equipe", label: "Organigramme", icon: "team", tone: "coral", hint: "Qui fait quoi" },
      { href: "/agence", label: "L'agence", icon: "agency", tone: "coral", hint: "Astrinova en bref" },
    ],
  },
  {
    title: "Administration",
    items: [{ href: "/admin", label: "Panel admin", icon: "admin", tone: "violet", hint: "Identifiants et statistiques", adminOnly: true }],
  },
];

/** Groupes visibles pour ce membre (le panel admin n'apparaît qu'aux admins). */
export const navGroupsFor = (isAdmin: boolean): NavGroup[] =>
  NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => isAdmin || !item.adminOnly) })).filter(
    (group) => group.items.length > 0,
  );
