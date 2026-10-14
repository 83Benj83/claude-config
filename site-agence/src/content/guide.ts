/**
 * Guide du prospecteur Astrinova, transcrit fidèlement du document de
 * l'équipe (mis à jour le 13 octobre 2026). Pour le modifier, éditer ce
 * fichier : chaque section est une suite de blocs mis en forme par l'écran
 * « Guide ». Dans les modèles, les passages entre crochets [ ] sont à
 * personnaliser et s'affichent en violet.
 */

export type GuideBlock =
  | { type: "text"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "steps"; items: { title: string; text: string }[] }
  | { type: "callout"; tone: "info" | "warn"; title: string; text: string }
  | { type: "links"; items: { label: string; value: string; href?: string }[] }
  | {
      type: "packs";
      items: { name: string; price: string; tagline: string; features: string[]; delay: string; subscription: string; tone: "mint" | "violet" | "gold" }[];
    }
  | { type: "table"; columns: string[]; emphasis?: number; rows: ({ group: string } | { cells: string[]; badges?: string[] })[] }
  | { type: "quotes"; items: { title: string; lines: [string, string][]; total: string; subscription: string }[] }
  | { type: "works"; items: { pack: string; name: string; text: string; url: string }[] }
  | { type: "templates"; items: { title: string; body: string }[] }
  | { type: "faq"; items: { q: string; a: string }[] }
  | { type: "dodont"; dos: string[]; donts: string[] }
  | { type: "glossary"; items: { term: string; definition: string }[] };

export type GuideSection = { id: string; title: string; intro?: string; blocks: GuideBlock[] };

const TEAM_EMAIL = "astrinova.website@gmail.com";
const PHONES = "06 22 82 88 32 ou au 06 52 23 75 73";

export const guide = {
  eyebrow: "Astrinova · Équipe prospection",
  title: "Guide du prospecteur",
  lead: "Tout ce qu’il faut savoir pour présenter Astrinova, répondre aux questions des commerçants et leur faire découvrir nos offres, sans jamais promettre ce qu’on ne fait pas.",
  updated: "Mis à jour le 13 octobre 2026. En cas de doute sur un prix, la page Tarifs du site fait toujours foi.",
  facts: [
    { label: "Ce qu’on vend", value: "Des sites internet pour commerces" },
    { label: "Prix des packs", value: "290 € à 990 €" },
    { label: "Paiement du site", value: "Une seule fois" },
    { label: "Délai de création", value: "1 semaine à 1 mois" },
  ],
  footer:
    "Guide interne Astrinova. Les prix et le contenu des packs reprennent la page Tarifs au 13 octobre 2026 ; ils peuvent évoluer, et c’est toujours la page en ligne qui fait foi.",

  sections: [
    {
      id: "role",
      title: "Votre rôle",
      intro: "Simple et clair : vous trouvez les clients, l’équipe fait le reste.",
      blocks: [
        {
          type: "steps",
          items: [
            {
              title: "Trouver des clients potentiels",
              text: "C’est votre mission principale : repérer les commerces qui ont besoin d’un site (pas de site, site daté, pas de réservation ou de commande en ligne…).",
            },
            {
              title: "Commencer la conversation, si vous le souhaitez",
              text: "Ce n’est pas obligatoire. Si vous le faites, utilisez les modèles de messages de ce guide.",
            },
            {
              title: "Prévenir l’équipe dès qu’un client est intéressé",
              text: `Par e-mail à ${TEAM_EMAIL}, avec la fiche de transmission. N’attendez pas : un client intéressé doit avoir une réponse rapidement.`,
            },
            {
              title: "Lui envoyer deux liens",
              text: "La page Tarifs (getnovaai.vercel.app/tarifs.html) et le formulaire de maquette (astrinovaformulaire.netlify.app). Le modèle « Client intéressé » les contient déjà.",
            },
          ],
        },
        {
          type: "callout",
          tone: "info",
          title: "Ce que vous ne gérez pas",
          text: `Le devis, les prix spéciaux, la maquette, le paiement et la mise en ligne sont gérés par l’équipe. Pour toute question : ${TEAM_EMAIL}.`,
        },
      ],
    },
    {
      id: "essentiel",
      title: "L’essentiel en une minute",
      intro: "À retenir avant votre premier message.",
      blocks: [
        {
          type: "text",
          text: "Astrinova conçoit des sites internet professionnels pour les commerces et les petites entreprises : restaurants, snacks, salons de thé, bubble tea, cafés, boulangeries, coiffeurs, barbiers, instituts de beauté, boutiques…",
        },
        {
          type: "text",
          text: "Notre promesse, telle qu’elle est écrite sur le site : un site clair, rapide, pensé pour donner confiance, sans jargon technique et sans mauvaise surprise sur le prix.",
        },
        { type: "heading", text: "Ce qui nous distingue" },
        {
          type: "list",
          items: [
            "Des prix affichés publiquement. Le commerçant compose lui-même son site sur la page Tarifs et voit le total exact, sans laisser ses coordonnées.",
            "Le site se paie une seule fois. Pas de contrat de location sur plusieurs années.",
            "Un abonnement facultatif (hébergement, nom de domaine, sécurité, mises à jour et actualités), résiliable à tout moment.",
            "Une maquette avant tout. Le client voit son site avant la mise en ligne et peut demander des ajustements. Rien n’est publié sans son accord.",
            "Des délais maximum annoncés : 1 semaine (Essentiel), 2 semaines (Pro), 1 mois (Signature).",
            "Une réponse sous 24 h à chaque demande.",
          ],
        },
        {
          type: "callout",
          tone: "info",
          title: "À retenir",
          text: `Dès qu’un commerçant est intéressé : prévenez l’équipe à ${TEAM_EMAIL}, puis envoyez-lui la page Tarifs et le formulaire de maquette. L’équipe prend le relais pour le devis, la maquette et la mise en ligne.`,
        },
      ],
    },
    {
      id: "liens",
      title: "Liens et contacts",
      intro: "À garder sous la main. Le bouton « Copier » met le lien dans votre presse-papiers.",
      blocks: [
        { type: "heading", text: "Les liens à envoyer et les pages du site" },
        {
          type: "links",
          items: [
            { label: "Tarifs et panier (le plus important)", value: "getnovaai.vercel.app/tarifs.html", href: "https://getnovaai.vercel.app/tarifs.html" },
            { label: "Formulaire de maquette (à envoyer au client)", value: "astrinovaformulaire.netlify.app", href: "https://astrinovaformulaire.netlify.app/" },
            { label: "Réalisations par pack", value: "getnovaai.vercel.app/deja-en-ligne.html", href: "https://getnovaai.vercel.app/deja-en-ligne.html" },
            { label: "Accueil", value: "getnovaai.vercel.app/commerce.html", href: "https://getnovaai.vercel.app/commerce.html" },
            { label: "Comment ça marche", value: "getnovaai.vercel.app/comment-ca-marche.html", href: "https://getnovaai.vercel.app/comment-ca-marche.html" },
            { label: "Ce que vous recevez", value: "getnovaai.vercel.app/ce-que-vous-recevez.html", href: "https://getnovaai.vercel.app/ce-que-vous-recevez.html" },
            { label: "Contact", value: "getnovaai.vercel.app/contact.html", href: "https://getnovaai.vercel.app/contact.html" },
            { label: "Mentions légales", value: "getnovaai.vercel.app/mentions-legales.html", href: "https://getnovaai.vercel.app/mentions-legales.html" },
            { label: "Confidentialité", value: "getnovaai.vercel.app/confidentialite.html", href: "https://getnovaai.vercel.app/confidentialite.html" },
          ],
        },
        { type: "heading", text: "Contacter l’équipe" },
        {
          type: "links",
          items: [
            { label: "E-mail de l’équipe (questions, clients potentiels, tout)", value: TEAM_EMAIL },
            { label: "Téléphone", value: "06 22 82 88 32" },
            { label: "Téléphone", value: "06 52 23 75 73" },
          ],
        },
        { type: "text", text: "Les demandes envoyées depuis le site et les réponses au formulaire de maquette arrivent automatiquement à l’équipe." },
      ],
    },
    {
      id: "packs",
      title: "Les trois packs",
      intro: "Le pack, c’est la base du site. Il se paie une seule fois. Le contenu ci-dessous est celui affiché sur la page Tarifs.",
      blocks: [
        {
          type: "packs",
          items: [
            {
              name: "Essentiel",
              price: "290 €",
              tagline: "Un site simple, efficace, qui fait le travail.",
              features: ["Site simple, sur-mesure", "Optimisé mobile", "Première maquette personnalisée", "Mise en ligne rapide"],
              delay: "1 semaine maximum",
              subscription: "25 € par mois (facultatif)",
              tone: "mint",
            },
            {
              name: "Pro",
              price: "490 €",
              tagline: "Un site professionnel pensé pour votre commerce.",
              features: ["Tout ce qui est inclus dans Essentiel", "Site professionnel de commerce", "Présentation des nouveautés et des offres", "Mise en avant des avis clients"],
              delay: "2 semaines maximum",
              subscription: "25 € par mois (facultatif)",
              tone: "violet",
            },
            {
              name: "Signature",
              price: "990 €",
              tagline: "Une expérience web haut de gamme, en 3D.",
              features: [
                "Tout ce qui est inclus dans Pro",
                "Site en 3D avec animations",
                "Fonctionnalités avancées sur mesure",
                "Commande ou réservation en ligne incluse (au choix)",
                "Abonnement réduit à 15 € par mois",
                "Accompagnement prioritaire",
              ],
              delay: "1 mois maximum",
              subscription: "15 € par mois (facultatif)",
              tone: "gold",
            },
          ],
        },
        { type: "heading", text: "Quel pack proposer ?" },
        {
          type: "table",
          columns: ["Le commerçant…", "Pack à proposer", "Pourquoi"],
          emphasis: 1,
          rows: [
            { cells: ["n’a pas de site et veut surtout exister en ligne (adresse, horaires, contact)", "Essentiel", "Le moins cher, en ligne en une semaine maximum."] },
            { cells: ["veut présenter ses produits, ses nouveautés, ses offres et ses avis clients", "Pro", "Conçu pour les commerces ; le meilleur équilibre prix / contenu."] },
            { cells: ["veut vendre ou prendre des rendez-vous en ligne", "Pro + option, ou Signature", "Signature inclut la commande ou la réservation en ligne : à comparer avec Pro + l’option."] },
            { cells: ["veut se démarquer avec un site spectaculaire (3D, animations)", "Signature", "Le haut de gamme, avec l’abonnement le moins cher."] },
          ],
        },
        {
          type: "callout",
          tone: "info",
          title: "Astuce de calcul",
          text: "Pour un commerce qui veut la commande en ligne : Pro + option commande = 490 + 290 = 780 € (à partir de), contre 990 € pour Signature, qui l’inclut et ajoute la 3D, l’accompagnement prioritaire et l’abonnement à 15 € au lieu de 25 €.",
        },
      ],
    },
    {
      id: "abonnement",
      title: "L’abonnement",
      intro: "Facultatif et résiliable à tout moment. C’est nous qui gardons le site en ligne, sécurisé et à jour.",
      blocks: [
        {
          type: "table",
          columns: ["Avec le pack", "Prix par mois", "Ce qui est compris"],
          emphasis: 1,
          rows: [
            { cells: ["Essentiel ou Pro", "25 €", "Hébergement · Nom de domaine · Sécurité · Mises à jour et ajout des actualités (nouvelle boisson de saison, nouvelles offres…)"] },
            { cells: ["Signature", "15 €", "Hébergement · Nom de domaine · Sécurité · Mises à jour et ajout des actualités (nouvelle boisson de saison, nouvelles offres…)"] },
          ],
        },
        {
          type: "text",
          text: "L’argument à retenir : le commerçant n’a rien de technique à gérer. Une nouvelle carte, une offre du moment, un changement d’horaires ? Il nous l’envoie et nous l’ajoutons pour lui.",
        },
      ],
    },
    {
      id: "options",
      title: "Les options à la carte",
      intro: "Le commerçant ajoute uniquement ce dont il a besoin. Les prix « à partir de » sont confirmés par l’équipe dans le devis.",
      blocks: [
        {
          type: "table",
          columns: ["Option", "Prix", "Ce que c’est", "Idéal pour"],
          emphasis: 1,
          rows: [
            { group: "Vendre et réserver" },
            {
              cells: ["Commande en ligne (click & collect)", "dès 290 €", "Les clients commandent et paient sur le site, puis viennent récupérer leur commande. Sans les commissions des plateformes de livraison.", "Restaurants, snacks, boulangeries, salons de thé"],
              badges: ["Populaire", "Incluse avec Signature"],
            },
            {
              cells: ["Réservation en ligne", "dès 120 €", "Réserver une table ou prendre rendez-vous depuis le site, 24 h/24.", "Restaurants, coiffeurs, barbiers, instituts de beauté"],
              badges: ["Populaire", "Incluse avec Signature"],
            },
            { cells: ["Bons cadeaux en ligne", "dès 150 €", "Cartes cadeaux achetées en quelques clics et reçues par e-mail. Idéal pour les fêtes et les anniversaires.", "Instituts de beauté, coiffeurs, restaurants, salons de thé"] },
            { group: "Être trouvé et inspirer confiance" },
            {
              cells: ["Fiche Google optimisée et QR code d’avis", "75 €", "Création ou optimisation de la fiche Google Maps (photos, horaires, catégories, description), avec un QR code à poser en caisse pour récolter plus d’avis.", "Tous les commerces"],
              badges: ["Recommandé"],
            },
            { cells: ["Adresse mail professionnelle", "40 €", "Une adresse à son nom (contact@moncommerce.fr) au lieu d’une adresse Gmail ou Hotmail. Le nom de domaine, lui, est compris dans l’abonnement.", "Tous les commerces"] },
            { cells: ["Version anglaise du site", "100 €", "Tout le site traduit en anglais, avec un bouton pour changer de langue.", "Restaurants, cafés, commerces en zone touristique"] },
            { group: "Image et visuel" },
            { cells: ["Création de logo simple", "dès 90 €", "Un logo propre, livré dans tous les formats utiles : site, réseaux sociaux, enseigne, impression.", "Commerces sans logo ou qui veulent le moderniser"] },
            { cells: ["Galerie avant / après", "50 €", "Un curseur interactif pour comparer avant et après.", "Coiffeurs, barbiers, instituts de beauté"] },
            { cells: ["Carte interactive avec QR code", "70 €", "Une photo par produit, des catégories claires, des prix faciles à mettre à jour, et un QR code sur les tables qui mène à la carte.", "Restaurants, snacks, salons de thé, bubble tea, cafés"] },
            { group: "Fidéliser" },
            { cells: ["Fil Instagram intégré", "60 €", "Les dernières publications Instagram s’affichent automatiquement sur le site. Nécessite un compte Instagram professionnel (gratuit).", "Salons de thé, bubble tea, boutiques, barbiers"] },
            { cells: ["Carte de fidélité digitale", "dès 250 €", "Une carte à tampons sur le téléphone des clients, qui reviennent plus souvent.", "Salons de thé, cafés, boulangeries, barbiers, snacks"] },
            { group: "Sur mesure" },
            { cells: ["Fonctionnalité qui n’est pas dans la liste", "Sur devis", "Le client l’ajoute une seule fois, même pour plusieurs besoins : une fenêtre s’ouvre et il décrit tout ce qu’il souhaite. L’équipe répond avec un prix adapté.", "Tous les besoins particuliers"] },
          ],
        },
        {
          type: "callout",
          tone: "info",
          title: "La règle Signature",
          text: "Avec Signature, une option entre commande et réservation en ligne est offerte. Si le client prend les deux, la plus chère (la commande en ligne) est offerte et l’autre est facturée. Le panier du site fait ce calcul tout seul.",
        },
      ],
    },
    {
      id: "devis",
      title: "Exemples de devis",
      intro: "Pour donner un ordre d’idée au téléphone. Le client obtient le même calcul sur la page Tarifs. Ce sont des exemples de composition, pas des clients réels.",
      blocks: [
        {
          type: "quotes",
          items: [
            {
              title: "Un snack qui veut le click & collect",
              lines: [["Pack Pro", "490 €"], ["Commande en ligne", "dès 290 €"], ["Fiche Google + QR code", "75 €"]],
              total: "dès 855 €",
              subscription: "25 € / mois",
            },
            {
              title: "Un coiffeur qui veut des rendez-vous",
              lines: [["Pack Essentiel", "290 €"], ["Réservation en ligne", "dès 120 €"], ["Galerie avant / après", "50 €"], ["Fiche Google + QR code", "75 €"]],
              total: "dès 535 €",
              subscription: "25 € / mois",
            },
            {
              title: "Un bubble tea qui veut fidéliser",
              lines: [["Pack Pro", "490 €"], ["Carte interactive + QR code", "70 €"], ["Fil Instagram intégré", "60 €"], ["Carte de fidélité", "dès 250 €"]],
              total: "dès 870 €",
              subscription: "25 € / mois",
            },
            {
              title: "Un restaurant haut de gamme",
              lines: [["Pack Signature", "990 €"], ["Réservation en ligne", "incluse"], ["Version anglaise", "100 €"]],
              total: "1 090 €",
              subscription: "15 € / mois",
            },
          ],
        },
      ],
    },
    {
      id: "realisations",
      title: "Les réalisations à montrer",
      intro: "Ce sont les sites présentés sur la page « Déjà en ligne », classés par pack. Envoyez de préférence le lien de cette page, qui les regroupe.",
      blocks: [
        {
          type: "works",
          items: [
            { pack: "Pack Essentiel", name: "The Finals Moments", text: "Site d’un créateur de contenu sur le jeu The Finals.", url: "site-l-u1lzdazd.vercel.app" },
            { pack: "Pack Essentiel", name: "DailyGameCheck", text: "Site d’un créateur qui note un jeu vidéo chaque jour.", url: "site-l-dm8hpwxy.vercel.app" },
            { pack: "Pack Essentiel", name: "Xsam", text: "Media kit d’un créateur de contenu Fortnite.", url: "site-l-1dwb8rce.vercel.app" },
            { pack: "Pack Pro", name: "Astrinova", text: "Application web qui réunit des marques de vêtements, avec le suivi des prix.", url: "astrinova.fr" },
            { pack: "Pack Pro", name: "Troc Livres", text: "Plateforme où les élèves donnent ou revendent leurs livres au sein de leur établissement.", url: "troclivres.fr" },
            { pack: "Pack Signature", name: "L’UNIVEUW", text: "Site sur-mesure d’un duo de rap, autour de leur album et de leurs singles.", url: "luniveuw.vercel.app" },
          ],
        },
        {
          type: "callout",
          tone: "warn",
          title: "Comment en parler honnêtement",
          text: "Présentez-les comme des sites réalisés par l’équipe. N’inventez ni témoignage, ni chiffre de résultats, ni nom de client. Les sites Essentiel sont des sites de créateurs de contenu : montrez-les pour la qualité du rendu, pas comme des exemples de commerces.",
        },
      ],
    },
    {
      id: "parcours",
      title: "Le parcours d’un client",
      intro: "De votre premier message à la mise en ligne.",
      blocks: [
        {
          type: "steps",
          items: [
            { title: "Vous trouvez le client", text: "Et, si vous le souhaitez, vous commencez la conversation (Instagram, e-mail, téléphone ou en boutique)." },
            { title: "Vous prévenez l’équipe", text: `Dès qu’il est intéressé, par e-mail à ${TEAM_EMAIL}, avec la fiche de transmission.` },
            {
              title: "Vous lui envoyez les tarifs et le formulaire",
              text: "Sur la page Tarifs, il compose son site et voit le total ; il peut aussi cliquer sur « Envoyer ma demande ». Le formulaire « Votre maquette sur mesure » lui pose 8 questions sur ses goûts (ambiance, style, couleurs, logo, ce qu’il ne veut pas, inspirations, priorités, pages), en environ 4 minutes. Seuls le nom du commerce et un moyen de le joindre sont obligatoires, et ses réponses nous arrivent automatiquement.",
            },
            { title: "L’équipe répond sous 24 h", text: "Pour confirmer le projet et les prix « à partir de »." },
            { title: "La maquette", text: "À partir de ses réponses au formulaire, l’équipe réalise une maquette à son image et lui envoie des captures." },
            { title: "Validation et mise en ligne", text: "Il voit son site avant la mise en ligne et peut demander des ajustements. Rien n’est publié sans son accord." },
            { title: "Après la livraison", text: "Avec l’abonnement, l’équipe garde le site en ligne, sécurisé et à jour, et ajoute ses actualités. Pour une question, il contacte directement l’équipe." },
          ],
        },
      ],
    },
    {
      id: "messages",
      title: "Modèles de messages",
      intro: "Remplacez les passages en violet avant d’envoyer. Un message personnalisé, avec une vraie observation sur le commerce, obtient bien plus de réponses qu’un copier-coller.",
      blocks: [
        {
          type: "templates",
          items: [
            {
              title: "Premier message (Instagram ou e-mail)",
              body: `Bonjour [nom du commerce],

Je m’appelle [votre prénom] et je fais partie d’Astrinova : nous créons des sites internet pour les commerces.

En regardant [votre page Instagram / votre fiche Google], j’ai remarqué que [observation précise : pas de site, carte introuvable, pas de réservation en ligne…].

Un site vous permettrait de [bénéfice concret : être trouvé sur Google, montrer votre carte, prendre des réservations…]

Nos prix sont affichés et le site se paie une seule fois, à partir de 290 €. Vous pouvez composer votre site et voir le total vous-même ici : https://getnovaai.vercel.app/tarifs.html

Si ce n’est pas le moment, dites-le-moi simplement et je ne vous relancerai pas.

[Votre prénom], Astrinova`,
            },
            {
              title: "Client intéressé : les tarifs et le formulaire",
              body: `Merci pour votre intérêt ! Voici les deux liens pour avancer :

– nos tarifs, pour composer votre site et voir le prix exact : https://getnovaai.vercel.app/tarifs.html
– un court formulaire (environ 4 minutes) pour nous dire vos goûts, afin que la maquette vous ressemble : https://astrinovaformulaire.netlify.app/

L’équipe revient vers vous très vite. Pour toute question : ${TEAM_EMAIL}, ou par téléphone au ${PHONES}.

[Votre prénom], Astrinova`,
            },
            {
              title: "Relance (une seule, quelques jours plus tard)",
              body: `Bonjour [nom du commerce],

Je me permets de revenir vers vous au sujet de votre site internet. Vous pouvez voir des sites que nous avons réalisés ici : https://getnovaai.vercel.app/deja-en-ligne.html

Si cela ne vous intéresse pas, aucun souci : ce sera mon dernier message.

[Votre prénom], Astrinova`,
            },
            {
              title: "Après l’envoi du mail détaillé par l’équipe",
              body: `Bonjour, nous venons de vous envoyer un mail avec toutes les informations sur votre futur site. Une question ? Nous répondons ici comme par mail, ou par téléphone au ${PHONES}. À très vite, [votre prénom] (Astrinova)`,
            },
            {
              title: "Réponse à quelqu’un qui a eu une mauvaise expérience",
              body: `Bonjour,

Merci d’avoir pris le temps de nous répondre, et nous sommes désolés pour ce qui vous est arrivé. Après une expérience pareille, votre méfiance est tout à fait normale.

Nous travaillons justement à l’opposé de ce genre de pratiques :
– nos prix sont affichés publiquement, et vous pouvez composer votre site vous-même pour voir le total exact, sans laisser vos coordonnées ;
– le site se paie une seule fois : pas de contrat de location sur plusieurs années ;
– l’abonnement (hébergement, mises à jour) est facultatif et résiliable à tout moment.

Jugez par vous-même ici : https://getnovaai.vercel.app/tarifs.html
Nos réalisations sont aussi visibles sur le site, dans « Déjà en ligne ».

Si vous préférez en parler de vive voix, nous sommes joignables au ${PHONES}. Et si vous ne souhaitez plus être contacté, dites-le-nous simplement : nous respecterons votre choix.

Bonne journée,
[Votre prénom], Astrinova`,
            },
          ],
        },
        { type: "heading", text: "Trame d’appel téléphonique" },
        {
          type: "steps",
          items: [
            { title: "Se présenter en une phrase", text: "« Bonjour, [votre prénom] d’Astrinova, nous créons des sites internet pour les commerces. Je vous prends deux minutes ? »" },
            { title: "Dire pourquoi vous l’appelez, lui", text: "Une observation précise : pas de site, horaires introuvables, pas de réservation en ligne…" },
            { title: "Poser une question ouverte", text: "« Aujourd’hui, comment vos nouveaux clients vous trouvent-ils ? »" },
            { title: "Proposer le lien, pas un engagement", text: "« Je vous envoie le lien de nos tarifs par SMS ou par e-mail : vous composez votre site et vous voyez le prix tout de suite. »" },
            { title: "Conclure poliment", text: "S’il n’est pas intéressé, remerciez-le et notez de ne plus le recontacter." },
          ],
        },
      ],
    },
    {
      id: "faq",
      title: "Questions fréquentes",
      intro: "Ce que vous pouvez répondre, avec des informations vérifiées. Cliquez sur une question pour voir la réponse.",
      blocks: [
        {
          type: "faq",
          items: [
            {
              q: "Combien ça coûte ?",
              a: "Le site se paie une seule fois : 290 € (Essentiel), 490 € (Pro) ou 990 € (Signature), plus les options choisies. L’abonnement est en plus, s’il le souhaite : 25 € par mois (15 € avec Signature). Le plus simple : envoyez-lui la page Tarifs, il voit le total exact.",
            },
            {
              q: "Faut-il signer un contrat ? Y a-t-il un engagement ?",
              a: "Pas de contrat sur plusieurs années : le prix est annoncé avant de commencer et le site se paie une seule fois. L’abonnement est facultatif et résiliable à tout moment.",
            },
            { q: "Combien de temps pour avoir mon site ?", a: "1 semaine maximum pour Essentiel, 2 semaines pour Pro et 1 mois pour Signature." },
            {
              q: "Est-ce que je verrai le site avant qu’il soit en ligne ?",
              a: "Oui. Grâce au formulaire de maquette (environ 4 minutes), l’équipe réalise une maquette à son image et lui envoie des captures. Il voit ensuite le site finalisé et peut demander des ajustements. Rien n’est publié sans son accord.",
            },
            { q: "Je n’ai pas de photos professionnelles ni de textes.", a: "Ce n’est pas un problème : l’équipe trouve avec lui la meilleure solution à partir de ce qu’il a." },
            {
              q: "C’est quoi l’abonnement exactement ?",
              a: "Nous gardons le site en ligne : hébergement, nom de domaine, sécurité et mises à jour. Nous ajoutons aussi ses actualités pour lui (nouvelle boisson de saison, nouvelles offres…). 25 € par mois avec Essentiel ou Pro, 15 € avec Signature. Facultatif et résiliable à tout moment.",
            },
            {
              q: "Est-ce que je serai bien visible sur Google ?",
              a: "Proposez l’option « Fiche Google optimisée et QR code d’avis » (75 €) : c’est souvent la première chose que voient ses futurs clients. Ne promettez jamais une première place sur Google : personne ne peut la garantir.",
            },
            {
              q: "Est-ce que mes clients pourront commander ou réserver en ligne ?",
              a: "Oui, avec l’option commande en ligne (dès 290 €) ou réservation en ligne (dès 120 €). Avec le pack Signature, l’une des deux est incluse.",
            },
            {
              q: "J’ai besoin d’une fonctionnalité qui n’est pas dans la liste.",
              a: "Il ajoute l’option « Sur mesure » tout en bas de la page Tarifs et décrit ce qu’il veut, même plusieurs choses. L’équipe lui répond avec un prix adapté.",
            },
            { q: "Le site sera-t-il adapté aux téléphones ?", a: "Oui, tous les sites sont optimisés pour le mobile en priorité, là où la majorité de ses clients le chercheront." },
            { q: "Avez-vous des exemples ?", a: "Oui : la page « Déjà en ligne » montre nos réalisations classées par pack. Voir la section Réalisations de ce guide." },
            {
              q: "Comment vous contacter ?",
              a: `Par la page Contact du site, par e-mail (${TEAM_EMAIL}) ou par téléphone (06 22 82 88 32 ou 06 52 23 75 73). Réponse sous 24 h.`,
            },
            {
              q: "À quoi sert le formulaire de maquette ?",
              a: "À connaître ses goûts (ambiance, style, couleurs, logo, ce qu’il ne veut pas, sites qui l’inspirent, pages voulues) pour que la maquette lui ressemble. 8 questions, environ 4 minutes, tout est facultatif sauf le nom du commerce et un moyen de le joindre. Les réponses nous arrivent automatiquement.",
            },
            {
              q: "Que deviennent mes informations si j’envoie une demande ?",
              a: "Elles servent uniquement à lui répondre et à préparer son devis. Tout est expliqué sur la page Confidentialité.",
            },
          ],
        },
        { type: "heading", text: "Les questions à renvoyer vers l’équipe" },
        {
          type: "text",
          text: "Sur ces sujets, ne répondez pas à la place de l’équipe et ne promettez rien. Dites simplement : « Je transmets votre question à l’équipe, qui vous répond sous 24 h. »",
        },
        {
          type: "list",
          items: [
            "Les modalités de paiement (acompte, paiement en plusieurs fois, moment du paiement).",
            "Ce qui se passe pour le site sans abonnement, ou après une résiliation.",
            "La propriété du site et des fichiers une fois livré.",
            "Le nombre de retouches compris dans le prix.",
            "Toute remise, tout prix spécial ou tout délai plus court que ceux annoncés.",
            "La reprise d’un site existant.",
            "Les factures et les informations administratives de l’entreprise.",
          ],
        },
      ],
    },
    {
      id: "objections",
      title: "Répondre aux objections",
      intro: "Écoutez d’abord, répondez ensuite avec un fait, puis laissez le choix.",
      blocks: [
        {
          type: "table",
          columns: ["Ce qu’il dit", "Ce que vous pouvez répondre"],
          rows: [
            { cells: ["« C’est trop cher. »", "Le site se paie une seule fois, à partir de 290 € avec Essentiel. Il peut ne prendre que les options vraiment utiles et voir le total exact sur la page Tarifs."] },
            {
              cells: [
                "« J’ai déjà Instagram / Facebook. »",
                "Un site complète ses réseaux : on le trouve sur Google et il réunit tout au même endroit (carte, horaires, adresse, contact). L’option « Fil Instagram intégré » affiche même ses publications sur le site.",
              ],
            },
            { cells: ["« Je n’ai pas le temps. »", "Il n’a rien de technique à faire : un formulaire d’environ 4 minutes sur ses goûts, puis il valide la maquette. Avec l’abonnement, nous ajoutons ses actualités pour lui."] },
            { cells: ["« J’ai déjà un site. »", "Demandez ce qui lui manque (commande, réservation, mobile, Google…). Pour une refonte, transmettez à l’équipe."] },
            {
              cells: [
                "« J’ai déjà été arnaqué / je suis en procès. »",
                "Ne discutez pas de son affaire et ne critiquez pas l’autre entreprise. Montrez la différence : prix publics, paiement unique, pas de location, abonnement résiliable. Utilisez le modèle « mauvaise expérience » de ce guide.",
              ],
            },
            { cells: ["« Je vais réfléchir. »", "Laissez-lui le lien de la page Tarifs pour composer son site quand il veut. Une seule relance, quelques jours plus tard."] },
            { cells: ["« Ça ne m’intéresse pas. »", "Remerciez-le, et ne le recontactez plus."] },
          ],
        },
      ],
    },
    {
      id: "regles",
      title: "Les règles d’or",
      intro: "La confiance est notre meilleur argument. Ces règles la protègent, et vous protègent aussi.",
      blocks: [
        {
          type: "dodont",
          dos: [
            "Vouvoyer, rester simple, sans jargon technique.",
            "Personnaliser chaque message avec une vraie observation sur le commerce.",
            "Envoyer le lien de la page Tarifs : le prix parle de lui-même.",
            "Toujours laisser un moyen simple de refuser (« dites-le-moi simplement »).",
            "Ne contacter les commerces que pour leur activité professionnelle.",
            "Prévenir l’équipe dès qu’un client est intéressé, et lui envoyer les tarifs et le formulaire.",
            `Renvoyer vers l’équipe (${TEAM_EMAIL}) dès que vous n’êtes pas sûr d’une réponse.`,
          ],
          donts: [
            "Promettre un prix, un délai ou une condition qui n’est pas sur le site.",
            "Garantir une première place sur Google ou un nombre de clients.",
            "Inventer des avis, des témoignages, des chiffres ou une fausse urgence (« plus que 2 places »).",
            "Relancer plus d’une fois, ou recontacter quelqu’un qui a dit non.",
            "Encaisser un paiement ou demander des coordonnées bancaires : le devis et le paiement passent par l’équipe.",
            "Partager les coordonnées des prospects en dehors de l’équipe.",
            "Dénigrer un concurrent.",
          ],
        },
      ],
    },
    {
      id: "transmettre",
      title: "Transmettre un prospect intéressé",
      intro: "À faire dès qu’un commerçant montre de l’intérêt, même s’il hésite encore.",
      blocks: [
        { type: "heading", text: "1. Prévenez l’équipe" },
        { type: "text", text: `Envoyez un e-mail à ${TEAM_EMAIL} avec cette fiche :` },
        {
          type: "templates",
          items: [
            {
              title: "Fiche de transmission",
              body: `Objet : Prospect intéressé — [nom du commerce]

Commerce : [nom et type de commerce]
Ville : [ville]
Contact : [nom, téléphone, e-mail]
Meilleur moment pour l’appeler : [jour, heure]
Ce qu’il veut : [pack envisagé, options, abonnement oui / non]
Ses questions ou hésitations : […]
Comment je l’ai contacté : [Instagram / e-mail / téléphone / en boutique]
Tarifs et formulaire envoyés : [oui / pas encore]
[Votre prénom]`,
            },
          ],
        },
        { type: "heading", text: "2. Envoyez-lui les tarifs et le formulaire" },
        {
          type: "text",
          text: "Utilisez le modèle « Client intéressé » : il contient le lien de la page Tarifs et celui du formulaire de maquette. S’il compose son site et clique sur « Envoyer ma demande », sa demande nous arrive avec tout le détail de son panier.",
        },
      ],
    },
    {
      id: "lexique",
      title: "Lexique",
      intro: "Pour expliquer les termes techniques avec des mots simples.",
      blocks: [
        {
          type: "glossary",
          items: [
            { term: "Nom de domaine", definition: "L’adresse du site, comme moncommerce.fr. Compris dans l’abonnement." },
            { term: "Hébergement", definition: "Le service qui garde le site en ligne, jour et nuit. Compris dans l’abonnement." },
            { term: "Maquette", definition: "Une première version du site, montrée au client avant la mise en ligne." },
            { term: "Click & collect", definition: "Le client commande et paie en ligne, puis vient chercher sa commande en boutique." },
            { term: "Fiche Google", definition: "La fiche du commerce dans Google Maps : adresse, horaires, photos, avis." },
            { term: "QR code", definition: "Un carré à scanner avec le téléphone, qui ouvre directement une page (la carte, la page d’avis…)." },
            { term: "Optimisé mobile", definition: "Le site s’affiche parfaitement sur téléphone." },
            { term: "« À partir de »", definition: "Prix de départ d’une option : le prix exact est confirmé par l’équipe dans le devis." },
            { term: "Sur devis", definition: "Le prix est calculé après avoir lu la demande du client." },
            { term: "Devis", definition: "Le document qui détaille ce qui sera fait et le prix, envoyé par l’équipe avant de commencer." },
          ],
        },
      ],
    },
  ] satisfies GuideSection[],
};
