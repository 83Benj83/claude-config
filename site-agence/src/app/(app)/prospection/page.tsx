import type { Metadata } from "next";
import { screenContext } from "@/lib/server/page";
import { loadProspectionView } from "@/lib/services/loaders";
import { ProspectionScreen } from "@/ui/screens/prospection-screen";
import { Screen } from "../screen";

export const metadata: Metadata = { title: "Prospecter" };

export default function ProspectionPage() {
  return (
    <Screen>
      <Prospection />
    </Screen>
  );
}

async function Prospection() {
  const { me, repository, today } = await screenContext();
  return <ProspectionScreen view={await loadProspectionView(repository, me, today)} />;
}
