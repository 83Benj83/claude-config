import type { Metadata } from "next";
import { screenContext } from "@/lib/server/page";
import { loadDirectoryView } from "@/lib/services/loaders";
import { SearchScreen } from "@/ui/screens/search-screen";
import { Screen } from "../screen";

export const metadata: Metadata = { title: "Déjà contacté ?" };

export default function SearchPage() {
  return (
    <Screen>
      <Search />
    </Screen>
  );
}

async function Search() {
  const { repository, today } = await screenContext();
  return <SearchScreen view={await loadDirectoryView(repository, today)} />;
}
