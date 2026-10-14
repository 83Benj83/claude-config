import type { Metadata } from "next";
import { GuideScreen } from "@/ui/screens/guide-screen";

export const metadata: Metadata = { title: "Guide du prospecteur" };

export default function GuidePage() {
  return <GuideScreen />;
}
