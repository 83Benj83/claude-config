import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <BrandMark />
      <p className="text-7xl font-semibold tracking-tighter text-fg">404</p>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Cette page n&apos;existe pas.</h1>
        <p className="mt-2 text-muted">Le lien est peut-être ancien, ou l&apos;adresse contient une faute de frappe.</p>
      </div>
      <Link href="/" className={buttonClasses()}>
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
