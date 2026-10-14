import type { Metadata } from "next";
import { screenContext } from "@/lib/server/page";
import { loadTeamView } from "@/lib/services/loaders";
import { TeamScreen } from "@/ui/screens/team-screen";
import { Screen } from "../screen";

export const metadata: Metadata = { title: "Équipe" };

export default function TeamPage() {
  return (
    <Screen>
      <Team />
    </Screen>
  );
}

async function Team() {
  const { me, repository } = await screenContext();
  return <TeamScreen view={await loadTeamView(repository, me)} />;
}
