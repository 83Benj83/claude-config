import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { Suspense } from "react";
import { Podium } from "@/components/ranking/podium";
import { buttonClasses } from "@/components/ui/button";
import { site } from "@/config/site";
import { formatDayLong } from "@/lib/dates";
import { getHomeData } from "@/lib/queries";

/** Le texte du hero est statique (rendu instantané), le podium du jour arrive en flux. */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
      <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7">
          <h1
            id="hero-title"
            className="animate-[rise_0.9s_var(--ease-out-expo)_both] text-[2.6rem] font-semibold leading-[1.02] tracking-tighter text-fg sm:text-6xl lg:text-[4.25rem]"
          >
            {site.hero.title}
          </h1>
          <p className="mt-6 max-w-[46ch] animate-[rise_0.9s_var(--ease-out-expo)_0.1s_both] text-lg leading-relaxed text-muted">
            {site.hero.subtitle}
          </p>
          <div className="mt-9 flex animate-[rise_0.9s_var(--ease-out-expo)_0.2s_both] flex-wrap gap-3">
            <Link href="/classement#ma-journee" className={buttonClasses({ size: "lg" })}>
              Saisir ma journée
              <ArrowRightIcon size={18} weight="bold" aria-hidden />
            </Link>
            <Link href="/guide" className={buttonClasses({ variant: "secondary", size: "lg" })}>
              Lire le guide
            </Link>
          </div>
        </div>

        <div className="animate-[rise_1s_var(--ease-out-expo)_0.25s_both] lg:col-span-5">
          <Suspense fallback={<div className="skeleton h-[22rem] rounded-2xl" aria-hidden />}>
            <TodayCard />
          </Suspense>
        </div>
      </div>
    </section>
  );
}

async function TodayCard() {
  const data = await getHomeData();
  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-3 -z-10 rotate-2 rounded-[1.75rem] bg-accent/12" />
      <article className="rounded-2xl border border-line bg-surface shadow-pop">
        <header className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-fg">Podium du jour</h2>
            <p className="text-sm text-subtle first-letter:uppercase">{formatDayLong(data.today)}</p>
          </div>
          <p className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-muted tabular">
            {data.enteredToday}/{data.prospectorCount} saisies
          </p>
        </header>

        <div className="px-5 pt-6 sm:px-8">
          {data.podium.length > 0 ? (
            <Podium
              compact
              places={data.podium.map((row) => ({
                id: row.member.id,
                fullName: row.member.fullName,
                avatarUrl: row.member.avatarUrl,
                total: row.total,
                rank: row.rank,
                isMe: row.member.id === data.me.id,
              }))}
            />
          ) : (
            <p className="pb-10 text-center text-sm text-muted">
              Personne n&apos;a encore saisi sa journée. La première saisie prend la tête.
            </p>
          )}
        </div>

        <footer className="border-t border-line px-5 py-3.5 sm:px-6">
          <Link
            href="/classement"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-ink underline-offset-4 hover:underline"
          >
            Voir le classement complet
            <ArrowRightIcon size={14} aria-hidden />
          </Link>
        </footer>
      </article>
    </div>
  );
}
