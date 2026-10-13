import type { Metadata } from "next";
import { screenContext } from "@/lib/server/page";
import { loadResourcesView } from "@/lib/services/loaders";
import { ResourcesScreen } from "@/ui/screens/resources-screen";
import { Screen } from "../screen";

export const metadata: Metadata = { title: "Mails et liens" };

export default function ResourcesPage() {
  return (
    <Screen>
      <Resources />
    </Screen>
  );
}

async function Resources() {
  const { me, repository } = await screenContext();
  return <ResourcesScreen view={await loadResourcesView(repository, me)} />;
}
