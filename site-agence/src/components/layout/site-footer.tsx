import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { navigation, site } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] md:items-center lg:px-8">
        <div className="flex flex-col gap-3">
          <BrandMark />
          <p className="max-w-sm text-sm text-subtle">
            {site.tagline}. Espace réservé à l&apos;équipe.
          </p>
        </div>
        <nav aria-label="Pied de page">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-fg">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
