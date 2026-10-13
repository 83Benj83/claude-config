import { Suspense } from "react";
import { signOut } from "@/app/actions/auth";
import { BrandMark } from "@/components/brand-mark";
import { getCurrentMember } from "@/lib/auth/session";
import { AccountMenu } from "./account-menu";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

/*
 * Échelle de z-index : header 40, menus et panneaux 50. Rien d'autre n'en utilise.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-bg/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <BrandMark />
        <NavLinks />
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <Suspense fallback={<span className="skeleton block size-9 rounded-full" aria-hidden />}>
            <AccountSlot />
          </Suspense>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}

async function AccountSlot() {
  const member = await getCurrentMember();
  if (!member) return null;
  return (
    <AccountMenu
      member={{
        fullName: member.fullName,
        jobTitle: member.jobTitle,
        avatarUrl: member.avatarUrl,
        isAdmin: member.isAdmin,
      }}
      signOutAction={signOut}
    />
  );
}
