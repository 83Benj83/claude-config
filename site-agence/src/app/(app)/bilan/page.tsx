import type { Metadata } from "next";
import { screenContext } from "@/lib/server/page";
import { loadReportView } from "@/lib/services/loaders";
import { ReportScreen } from "@/ui/screens/report-screen";
import { Screen } from "../screen";

export const metadata: Metadata = { title: "Bilan du mois" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function ReportPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Screen>
      <Report searchParams={searchParams} />
    </Screen>
  );
}

async function Report({ searchParams }: { searchParams: SearchParams }) {
  const [{ me, repository, today }, { mois }] = await Promise.all([screenContext(), searchParams]);
  // key : l'écran repart sur l'onglet par défaut quand on change de mois.
  const view = await loadReportView(repository, me, today, mois);
  return <ReportScreen key={view.month} view={view} />;
}
