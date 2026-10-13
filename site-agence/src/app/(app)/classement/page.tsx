import type { Metadata } from "next";
import { screenContext } from "@/lib/server/page";
import { loadRankingView } from "@/lib/services/loaders";
import { RankingScreen } from "@/ui/screens/ranking-screen";
import { Screen } from "../screen";

export const metadata: Metadata = { title: "Classement" };

export default function RankingPage() {
  return (
    <Screen>
      <Ranking />
    </Screen>
  );
}

async function Ranking() {
  const { me, repository, today } = await screenContext();
  return <RankingScreen view={await loadRankingView(repository, me, today)} />;
}
