import type { Metadata } from "next";
import { screenContext } from "@/lib/server/page";
import { AgencyScreen } from "@/ui/screens/agency-screen";
import { Screen } from "../screen";

export const metadata: Metadata = { title: "L'agence" };

export default function AgencyPage() {
  return (
    <Screen>
      <Agency />
    </Screen>
  );
}

/** Contenu fixe, mais réservé à l'équipe : la session est vérifiée à chaque affichage. */
async function Agency() {
  await screenContext();
  return <AgencyScreen />;
}
