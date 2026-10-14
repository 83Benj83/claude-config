import type { Metadata } from "next";
import { screenContext } from "@/lib/server/page";
import { loadActivityView } from "@/lib/services/loaders";
import { ActivityScreen } from "@/ui/screens/activity-screen";
import { Screen } from "../screen";

export const metadata: Metadata = { title: "Activité" };

export default function ActivityPage() {
  return (
    <Screen>
      <Activity />
    </Screen>
  );
}

async function Activity() {
  const { repository, today } = await screenContext({ admin: true });
  return <ActivityScreen view={await loadActivityView(repository, today)} />;
}
