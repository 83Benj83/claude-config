import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireMember } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/env";
import { summarize } from "@/lib/views";
import { WelcomeScreen } from "@/ui/screens/welcome-screen";
import { NextPlatform } from "../next-platform";

export const metadata: Metadata = { title: "Bienvenue" };

export default function WelcomePage() {
  return (
    <Suspense>
      <Welcome />
    </Suspense>
  );
}

async function Welcome() {
  const me = await requireMember({ allowFirstLogin: true });
  if (me.welcomedAt) redirect("/");
  const summary = summarize(me);
  return (
    <NextPlatform me={summary} isDemo={isDemoMode()}>
      <WelcomeScreen member={summary} />
    </NextPlatform>
  );
}
