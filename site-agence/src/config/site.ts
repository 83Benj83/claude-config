/**
 * Contenu éditorial de l'espace. Tout ce qui décrit l'agence se modifie ici :
 * nom, présentation, packs, parcours client et engagements. Les mêmes textes
 * servent au site et à l'aperçu interactif. Les chiffres reprennent le guide
 * du prospecteur (page Tarifs au 13 octobre 2026) : c'est la page Tarifs du
 * site public qui fait foi.
 */

export type IconName = "target" | "mail" | "send" | "palette" | "rocket" | "shield" | "tag" | "receipt" | "eye";

export type Tone = "violet" | "gold" | "mint" | "coral";

export const site = {
  name: "Astrinova",
  space: "Espace équipe",
  tagline: "Sites internet pour les commerces",
  description:
    "L'espace de l'équipe Astrinova : prospection, commerces déjà contactés, guide du prospecteur, contrats et ressources.",

  hero: {
    title: "Des sites internet pour les commerces, à prix affichés.",
    subtitle:
      "Un site clair, rapide, pensé pour donner confiance, sans jargon technique et sans mauvaise surprise sur le prix.",
  },

  facts: [
    { label: "Ce qu'on vend", value: "Des sites pour commerces" },
    { label: "Prix des packs", value: "290 € à 990 €" },
    { label: "Paiement du site", value: "Une seule fois" },
    { label: "Délai de création", value: "1 semaine à 1 mois" },
  ],

  about: {
    title: "Vous trouvez les clients, l'équipe fait le reste.",
    body: "Astrinova conçoit des sites internet professionnels pour les commerces et les petites entreprises : restaurants, snacks, salons de thé, bubble tea, cafés, boulangeries, coiffeurs, barbiers, instituts de beauté, boutiques…",
  },

  packs: [
    {
      name: "Essentiel",
      price: "290 €",
      tagline: "Un site simple, efficace, qui fait le travail.",
      delay: "1 semaine maximum",
      subscription: "25 € par mois (facultatif)",
      tone: "mint",
    },
    {
      name: "Pro",
      price: "490 €",
      tagline: "Un site professionnel pensé pour votre commerce.",
      delay: "2 semaines maximum",
      subscription: "25 € par mois (facultatif)",
      tone: "violet",
    },
    {
      name: "Signature",
      price: "990 €",
      tagline: "Une expérience web haut de gamme, en 3D.",
      delay: "1 mois maximum",
      subscription: "15 € par mois (facultatif)",
      tone: "gold",
    },
  ] satisfies { name: string; price: string; tagline: string; delay: string; subscription: string; tone: Tone }[],

  method: [
    { icon: "target", verb: "Trouver", text: "Repérer les commerces qui ont besoin d'un site : pas de site, site daté, pas de réservation ni de commande en ligne." },
    { icon: "mail", verb: "Prévenir l'équipe", text: "Dès qu'un client est intéressé, par e-mail avec la fiche de transmission." },
    { icon: "send", verb: "Envoyer deux liens", text: "La page Tarifs et le formulaire de maquette, avec le modèle « Client intéressé »." },
    { icon: "palette", verb: "La maquette", text: "L'équipe répond sous 24 h et réalise une maquette à l'image du commerce." },
    { icon: "rocket", verb: "La mise en ligne", text: "Le client voit son site avant et peut demander des ajustements. Rien n'est publié sans son accord." },
    { icon: "shield", verb: "Le suivi", text: "Avec l'abonnement, le site reste en ligne, sécurisé et à jour." },
  ] satisfies { icon: IconName; verb: string; text: string }[],

  values: [
    { icon: "tag", title: "Des prix affichés.", text: "Le commerçant compose lui-même son site sur la page Tarifs et voit le total exact, sans laisser ses coordonnées." },
    { icon: "receipt", title: "Un paiement unique.", text: "Le site se paie une seule fois, sans contrat de location. L'abonnement est facultatif et résiliable à tout moment." },
    { icon: "eye", title: "Une maquette avant tout.", text: "Le client voit son site avant la mise en ligne. Réponse sous 24 h à chaque demande." },
  ] satisfies { icon: IconName; title: string; text: string }[],

  closing: {
    title: "Ta journée compte.",
    text: "Ajoute chaque commerce dès que tu l'as contacté : dix secondes, et toute l'équipe sait qu'il a déjà été démarché.",
  },
} as const;
