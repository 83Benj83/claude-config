"use client";

import { CheckCircleIcon, ClockIcon, SignInIcon, XCircleIcon } from "@phosphor-icons/react";
import type { ActivityLogin, ActivityRow, ActivityView } from "@/lib/activity";
import { formatBytes } from "@/lib/attachments";
import { APP_TIME_ZONE, formatDayLong, formatDayShort, formatRelativeDay, todayIso } from "@/lib/dates";
import { formatInt, pluralize } from "@/lib/format";
import type { IsoDate } from "@/lib/types";
import { Avatar } from "../primitives/avatar";
import { Badge, Card, CardHeader, EmptyState, ScreenHeader } from "../primitives/surface";

const timeFormatter = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: APP_TIME_ZONE });
const dayLetterFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "narrow", timeZone: "UTC" });

const time = (iso: string) => timeFormatter.format(new Date(iso));
/** « aujourd'hui à 09:05 », « hier à 18:02 », « mar. 6 oct. à 10:00 » */
const when = (iso: string, today: IsoDate) => `${formatRelativeDay(todayIso(new Date(iso)), today).toLowerCase()} à ${time(iso)}`;

/**
 * Activité du site (admins) : qui est venu aujourd'hui, la présence et le
 * travail de chacun sur 7 jours, le journal des connexions et les chiffres
 * utiles (contrats, fichiers, espace de stockage).
 */
export function ActivityScreen({ view }: { view: ActivityView }) {
  const { totals } = view;
  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title="Activité"
        description="Qui vient sur le site, les connexions et le travail de l'équipe sur 7 jours. Réservé aux administrateurs."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Figure label="Venus aujourd'hui" value={`${formatInt(totals.presentToday)} / ${formatInt(totals.members)}`} />
        <Figure label="Prospects ajoutés aujourd'hui" value={formatInt(totals.prospectsToday)} />
        <Figure label="Messages aujourd'hui" value={formatInt(totals.messagesToday)} />
        <Figure label="Connexions refusées aujourd'hui" value={formatInt(totals.refusedToday)} alert={totals.refusedToday > 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-8">
          <TodayCard view={view} />
          <WeekCard view={view} />
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-4">
          <LoginsCard logins={view.logins} today={view.today} />
          <SiteCard view={view} />
        </div>
      </div>
    </div>
  );
}

function Figure({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`min-w-0 rounded-2xl border px-3 py-3 sm:px-4 sm:py-3.5 ${alert ? "border-danger/40 bg-danger-soft" : "border-line bg-surface"}`}>
      <p className={`text-xs ${alert ? "text-danger" : "text-subtle"}`}>{label}</p>
      <p className={`mt-0.5 font-display text-2xl font-bold tracking-tight tabular ${alert ? "text-danger" : "text-fg"}`}>{value}</p>
    </div>
  );
}

/** Aujourd'hui : chacun, venu ou pas, avec l'heure d'arrivée et de dernière visite. */
function TodayCard({ view }: { view: ActivityView }) {
  return (
    <Card aria-labelledby="activite-aujourdhui">
      <CardHeader id="activite-aujourdhui" title="Aujourd'hui" description={<span className="first-letter:uppercase">{formatDayLong(view.today)}</span>} />
      <ul className="mt-3 divide-y divide-line border-t border-line" aria-label="Présence aujourd'hui">
        {view.rows.map((row) => (
          <li key={row.member.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
            <span className="relative shrink-0">
              <Avatar member={row.member} size="sm" />
              {row.today && <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-surface bg-success" aria-hidden />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">{row.member.fullName}</p>
              <p className="mt-0.5 text-xs text-subtle" suppressHydrationWarning>
                {todayStatus(row, view.today)}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-1.5">
              {row.prospectsToday > 0 && <Badge tone="accent">+{pluralize(row.prospectsToday, "prospect")}</Badge>}
              {row.messagesToday > 0 && <Badge>{pluralize(row.messagesToday, "message")}</Badge>}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function todayStatus(row: ActivityRow, today: IsoDate): string {
  if (row.today) {
    const first = time(row.today.firstSeenAt);
    const last = time(row.today.lastSeenAt);
    return first === last ? `Venu à ${first}` : `Venu à ${first} · dernière visite à ${last}`;
  }
  if (row.neverSeen) return "Jamais connecté";
  return row.lastSeenAt ? `Pas encore venu · dernière visite ${when(row.lastSeenAt, today)}` : "Pas encore venu";
}

/** Les 7 derniers jours : présence jour par jour, prospects et messages. */
function WeekCard({ view }: { view: ActivityView }) {
  return (
    <Card aria-labelledby="activite-semaine">
      <CardHeader
        id="activite-semaine"
        title="Les 7 derniers jours"
        description={`Du ${formatDayShort(view.days[0])} au ${formatDayShort(view.days.at(-1)!)} : un point par jour de visite.`}
      />
      <div className="mt-3 flex items-center justify-end gap-3 border-t border-line px-4 pt-3 sm:px-5" aria-hidden>
        <span className="flex gap-1">
          {view.days.map((day) => (
            <span key={day} className={`w-3 text-center text-[0.625rem] font-semibold ${day === view.today ? "text-fg" : "text-subtle"}`}>
              {dayLetterFormatter.format(new Date(`${day}T00:00:00Z`))}
            </span>
          ))}
        </span>
      </div>
      <ul className="divide-y divide-line" aria-label="Présence et activité sur 7 jours">
        {view.rows.map((row) => {
          const present = row.days.filter(Boolean).length;
          return (
            <li key={row.member.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <Avatar member={row.member} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{row.member.fullName}</p>
                <p className="mt-0.5 truncate text-xs text-subtle">
                  {pluralize(row.prospectsWeek, "prospect")} · {pluralize(row.messagesWeek, "message")}
                </p>
              </div>
              <span className="sr-only">
                Venu {present} jour{present > 1 ? "s" : ""} sur {view.days.length}
              </span>
              <span className="flex shrink-0 gap-1" aria-hidden>
                {row.days.map((seen, index) => (
                  <span
                    key={view.days[index]}
                    title={`${formatDayShort(view.days[index])} : ${seen ? "venu" : "pas venu"}`}
                    className={`size-3 rounded-full ${seen ? "bg-accent" : "border border-line-strong"}`}
                  />
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** Journal des connexions avec mot de passe : réussies et refusées. */
function LoginsCard({ logins, today }: { logins: ActivityLogin[]; today: IsoDate }) {
  return (
    <Card aria-labelledby="activite-connexions">
      <CardHeader id="activite-connexions" title="Connexions" description="Mots de passe tapés ces 7 derniers jours." />
      {logins.length === 0 ? (
        <EmptyState icon={<SignInIcon size={24} aria-hidden />} title="Aucune connexion.">
          Personne n&apos;a tapé son mot de passe ces 7 derniers jours.
        </EmptyState>
      ) : (
        <ul className="mt-3 divide-y divide-line border-t border-line" aria-label="Journal des connexions">
          {logins.map((event) => (
            <li key={event.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
              {event.ok ? (
                <CheckCircleIcon size={20} weight="fill" className="mt-px shrink-0 text-success" aria-hidden />
              ) : (
                <XCircleIcon size={20} weight="fill" className="mt-px shrink-0 text-danger" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{event.name ?? `« ${event.login} »`}</p>
                <p className={`text-xs ${event.ok ? "text-subtle" : "text-danger"}`} suppressHydrationWarning>
                  {event.ok ? "Connecté" : "Mot de passe refusé"} · {when(event.at, today)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="flex gap-2 border-t border-line px-4 py-3.5 text-xs text-subtle sm:px-5">
        <ClockIcon size={16} className="shrink-0" aria-hidden />
        Une connexion dure 30 jours : chacun ne retape son mot de passe qu&apos;après s&apos;être déconnecté. Pour savoir qui travaille,
        regarde plutôt les visites.
      </p>
    </Card>
  );
}

/** Chiffres du site : équipe, contrats, fichiers et espace de stockage. */
function SiteCard({ view }: { view: ActivityView }) {
  const { site } = view;
  const used = Math.min(100, (site.bytes / site.quotaBytes) * 100);
  const rows: { label: string; value: string }[] = [
    { label: "Admins", value: site.admins.join(", ") || "personne" },
    { label: "Jamais connectés", value: site.neverConnected.join(", ") || "personne" },
    { label: "Identifiants désactivés", value: formatInt(site.inactive) },
    { label: "Commerces déjà contactés", value: formatInt(site.establishments) },
    { label: "Contrats en cours", value: formatInt(site.contractsInProgress) },
    { label: "Contrats effectués", value: formatInt(site.contractsDone) },
    {
      label: "Statistiques comptées depuis",
      value: site.statsSince ? formatDayShort(todayIso(new Date(site.statsSince))) : "le début",
    },
  ];
  return (
    <Card aria-labelledby="activite-site">
      <CardHeader id="activite-site" title="Le site en chiffres" />
      <dl className="mt-3 divide-y divide-line border-t border-line">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 px-4 py-2.5 sm:px-5">
            <dt className="shrink-0 text-sm text-muted">{row.label}</dt>
            <dd className="min-w-0 text-right text-sm font-semibold text-fg">{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="border-t border-line px-4 py-3.5 sm:px-5">
        <p className="flex items-baseline justify-between gap-4 text-sm">
          <span className="text-muted">Fichiers de l&apos;échange</span>
          <span className="font-semibold text-fg">
            {pluralize(site.files, "fichier")} · {formatBytes(site.bytes)}
          </span>
        </p>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label="Espace de stockage utilisé"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(used)}
        >
          <div className={`h-full rounded-full ${used > 80 ? "bg-danger" : "bg-accent"}`} style={{ width: `${Math.max(used, site.bytes > 0 ? 1 : 0)}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-subtle">Sur {formatInt(site.quotaBytes / 1024 ** 3)} Go inclus dans l&apos;offre gratuite de la base.</p>
      </div>
    </Card>
  );
}
