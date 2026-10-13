import type { Metadata } from "next";
import { AgencyScreen } from "@/ui/screens/agency-screen";

export const metadata: Metadata = { title: "L'agence" };

export default function AgencyPage() {
  return <AgencyScreen />;
}
