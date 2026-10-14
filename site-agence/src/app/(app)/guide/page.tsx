import type { Metadata } from "next";
import { GUIDE_HTML } from "@/content/guide-original";
import { screenContext } from "@/lib/server/page";
import { GuideScreen } from "@/ui/screens/guide-screen";
import { Screen } from "../screen";

export const metadata: Metadata = { title: "Guide du prospecteur" };

export default function GuidePage() {
  return (
    <Screen>
      <Guide />
    </Screen>
  );
}

/** Contenu fixe, mais réservé à l'équipe : la session est vérifiée à chaque affichage. */
async function Guide() {
  await screenContext();
  // Le guide n'est envoyé qu'après vérification de la session.
  return <GuideScreen html={GUIDE_HTML} />;
}
