import { ArrowRightIcon, InfoIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { getCurrentMember } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { isDemoMode } from "@/lib/env";
import { getToday } from "@/lib/queries";

/** Bandeau visible tant que Supabase n'est pas configuré. */
export function DemoBanner() {
  if (!isDemoMode()) return null;
  return (
    <div className="border-b border-line bg-surface-2 text-[0.8125rem] text-muted">
      <p className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 sm:px-6 lg:px-8">
        <InfoIcon size={16} className="shrink-0 text-accent-ink" aria-hidden />
        <span>
          <strong className="font-medium text-fg">Mode démo.</strong> Données fictives, remises à zéro au
          redémarrage. Branche Supabase pour l&apos;utiliser avec l&apos;équipe (voir le README).
        </span>
      </p>
    </div>
  );
}

/** Rappel affiché aux prospecteurs qui n'ont pas encore saisi leur journée. */
export async function EntryReminder() {
  const member = await getCurrentMember();
  if (!member?.isProspector) return null;

  const today = await getToday();
  const repository = await getRepository();
  const entries = await repository.listEntries({ from: today, to: today });
  if (entries.some((entry) => entry.memberId === member.id)) return null;

  return (
    <div className="border-b border-accent/30 bg-accent-soft">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-sm sm:px-6 lg:px-8">
        <p className="text-fg">
          <span className="font-semibold">{member.fullName.split(" ")[0]}</span>, ta journée n&apos;est pas
          encore saisie.
        </p>
        <Link
          href="/classement#ma-journee"
          className="inline-flex items-center gap-1.5 font-medium text-accent-ink underline-offset-4 hover:underline"
        >
          Saisir ma journée
          <ArrowRightIcon size={14} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
