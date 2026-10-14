import type { Metadata } from "next";
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
  return <GuideScreen />;
}
