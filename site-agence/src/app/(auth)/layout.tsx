import { BookOpenTextIcon, ChartBarIcon, UsersThreeIcon } from "@phosphor-icons/react/ssr";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { site } from "@/config/site";

const HIGHLIGHTS = [
  { icon: UsersThreeIcon, text: "L'organigramme de l'équipe" },
  { icon: BookOpenTextIcon, text: "Le guide de prospection" },
  { icon: ChartBarIcon, text: "Le classement et le bilan du mois" },
];

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="dot-grid relative hidden flex-col justify-between overflow-hidden border-r border-line bg-surface-2 p-10 lg:flex xl:p-14">
        <BrandMark href="/connexion" />
        <div className="max-w-md">
          <p className="text-4xl font-semibold leading-[1.05] tracking-tighter text-fg xl:text-5xl">
            L&apos;espace de l&apos;équipe {site.name}.
          </p>
          <ul className="mt-10 flex flex-col gap-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-muted">
                <span className="grid size-9 place-items-center rounded-full border border-line bg-surface text-accent-ink">
                  <Icon size={18} aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-subtle">{site.tagline}</p>
        <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-24 size-72 rounded-full bg-accent/15 blur-3xl" />
      </aside>

      <div className="flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 sm:px-8">
          <span className="lg:invisible">
            <BrandMark href="/connexion" />
          </span>
          <ThemeToggle />
        </div>
        <main className="flex flex-1 items-center justify-center px-4 pt-6 pb-16 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}
