import type { Metadata } from "next";
import { screenContext } from "@/lib/server/page";
import { loadAdminView } from "@/lib/services/loaders";
import { AdminScreen } from "@/ui/screens/admin-screen";
import { Screen } from "../screen";

export const metadata: Metadata = { title: "Identifiants" };

export default function AdminPage() {
  return (
    <Screen>
      <Admin />
    </Screen>
  );
}

async function Admin() {
  const { me, repository } = await screenContext({ admin: true });
  return <AdminScreen view={await loadAdminView(repository, me)} />;
}
