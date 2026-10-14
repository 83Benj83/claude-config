import type { Metadata } from "next";
import { screenContext } from "@/lib/server/page";
import { loadContractsView } from "@/lib/services/loaders";
import { ContractsScreen } from "@/ui/screens/contracts-screen";
import { Screen } from "../screen";

export const metadata: Metadata = { title: "Contrats" };

export default function ContractsPage() {
  return (
    <Screen>
      <Contracts />
    </Screen>
  );
}

async function Contracts() {
  const { me, repository, today } = await screenContext();
  return <ContractsScreen view={await loadContractsView(repository, me, today)} />;
}
