import type { Metadata } from "next";
import { screenContext } from "@/lib/server/page";
import { loadHomeView } from "@/lib/services/loaders";
import { HomeScreen } from "@/ui/screens/home-screen";
import { Screen } from "./screen";

export const metadata: Metadata = { title: "Accueil" };

export default function HomePage() {
  return (
    <Screen>
      <Home />
    </Screen>
  );
}

async function Home() {
  const { me, repository, today } = await screenContext();
  return <HomeScreen view={await loadHomeView(repository, me, today)} />;
}
