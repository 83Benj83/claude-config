import { Suspense } from "react";
import { DemoBanner, EntryReminder } from "@/components/layout/notices";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-inverse focus:px-4 focus:py-2 focus:text-sm focus:text-on-inverse"
      >
        Aller au contenu
      </a>
      <SiteHeader />
      <DemoBanner />
      <Suspense fallback={null}>
        <EntryReminder />
      </Suspense>
      <main id="contenu" className="flex-1 overflow-x-clip">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
