import type { Metadata } from "next";
import { screenContext } from "@/lib/server/page";
import { loadLeadsView } from "@/lib/services/loaders";
import { LeadsScreen } from "@/ui/screens/leads-screen";
import { Screen } from "../screen";

export const metadata: Metadata = { title: "À contacter" };

export default function LeadsPage() {
  return (
    <Screen>
      <Leads />
    </Screen>
  );
}

async function Leads() {
  const { me, repository, today } = await screenContext();
  return <LeadsScreen view={await loadLeadsView(repository, me, today)} />;
}
