/**
 * Ressources de départ de « Mails et liens » : contacts de l'équipe, liens à
 * envoyer et modèles de messages, repris du guide du prospecteur (une seule
 * source pour les modèles). Elles servent au mode démo, à l'aperçu et au
 * premier import du site ; ensuite, les admins les gèrent depuis le site.
 */
import type { Resource } from "@/lib/types";
import { guide, type GuideSection } from "./guide";

type Seed = Omit<Resource, "sortOrder">;

const contacts: Seed[] = [
  { id: "contact-email", kind: "email", title: "E-mail de l'équipe", value: "astrinova.website@gmail.com", note: "Questions, clients potentiels, tout. Réponse sous 24 h." },
  { id: "contact-tel-1", kind: "phone", title: "Téléphone de l'équipe", value: "06 22 82 88 32", note: null },
  { id: "contact-tel-2", kind: "phone", title: "Téléphone de l'équipe (2)", value: "06 52 23 75 73", note: null },
];

const links: Seed[] = [
  { id: "lien-tarifs", kind: "link", title: "Tarifs et panier", value: "https://getnovaai.vercel.app/tarifs.html", note: "Le plus important : le commerçant compose son site et voit le total exact." },
  { id: "lien-formulaire", kind: "link", title: "Formulaire de maquette", value: "https://astrinovaformulaire.netlify.app/", note: "À envoyer au client : 8 questions, environ 4 minutes." },
  { id: "lien-realisations", kind: "link", title: "Réalisations par pack", value: "https://getnovaai.vercel.app/deja-en-ligne.html", note: "La page « Déjà en ligne », à montrer en exemple." },
  { id: "lien-accueil", kind: "link", title: "Accueil du site", value: "https://getnovaai.vercel.app/commerce.html", note: null },
  { id: "lien-fonctionnement", kind: "link", title: "Comment ça marche", value: "https://getnovaai.vercel.app/comment-ca-marche.html", note: null },
  { id: "lien-livrables", kind: "link", title: "Ce que vous recevez", value: "https://getnovaai.vercel.app/ce-que-vous-recevez.html", note: null },
  { id: "lien-contact", kind: "link", title: "Page Contact", value: "https://getnovaai.vercel.app/contact.html", note: null },
];

/** Modèles du guide (sections « Modèles de messages » et « Transmettre un prospect »). */
function templates(): Seed[] {
  const notes: Record<string, string> = {
    "Premier message (Instagram ou e-mail)": "Remplace les passages entre crochets avant d'envoyer.",
    "Relance (une seule, quelques jours plus tard)": "Une seule relance, jamais plus.",
    "Fiche de transmission": "À envoyer à l'équipe dès qu'un commerçant est intéressé.",
  };
  const sections: readonly GuideSection[] = guide.sections;
  return sections
    .flatMap((section) => section.blocks)
    .flatMap((block) => (block.type === "templates" ? block.items : []))
    .map((template, index) => ({
      id: `modele-${index + 1}`,
      kind: "template" as const,
      title: template.title,
      value: template.body,
      note: notes[template.title] ?? null,
    }));
}

export const AGENCY_RESOURCES: readonly Resource[] = [...contacts, ...links, ...templates()].map((resource, index) => ({
  ...resource,
  sortOrder: index + 1,
}));
