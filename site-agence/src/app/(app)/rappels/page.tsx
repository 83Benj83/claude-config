import type { Metadata } from "next";
import { screenContext } from "@/lib/server/page";
import { loadCallbacksView } from "@/lib/services/loaders";
import { CallbacksScreen } from "@/ui/screens/callbacks-screen";
import { Screen } from "../screen";

export const metadata: Metadata = { title: "Rappels" };

export default function CallbacksPage() {
  return (
    <Screen>
      <Callbacks />
    </Screen>
  );
}

async function Callbacks() {
  const { me, repository, today } = await screenContext();
  return <CallbacksScreen view={await loadCallbacksView(repository, me, today)} />;
}
