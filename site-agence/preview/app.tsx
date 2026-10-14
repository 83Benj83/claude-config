import { createContext, use, useCallback, useEffect, useMemo, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import type { CsvExport } from "@/lib/actions-contract";
import type { Repository } from "@/lib/data/repository";
import { todayIso } from "@/lib/dates";
import * as loaders from "@/lib/services/loaders";
import type { Member } from "@/lib/types";
import { summarize } from "@/lib/views";
import { PlatformProvider, type LinkProps, type Platform } from "@/ui/platform";
import { BrandMark } from "@/ui/primitives/brand-mark";
import { buttonClasses } from "@/ui/primitives/button";
import { ToastProvider } from "@/ui/primitives/toast";
import { ActivityScreen } from "@/ui/screens/activity-screen";
import { AdminScreen } from "@/ui/screens/admin-screen";
import { AgencyScreen } from "@/ui/screens/agency-screen";
import { ContractsScreen } from "@/ui/screens/contracts-screen";
import { GuideScreen } from "@/ui/screens/guide-screen";
import { GUIDE_HTML } from "@/content/guide-original";
import { ChatScreen } from "@/ui/screens/chat-screen";
import { HomeScreen } from "@/ui/screens/home-screen";
import { LoginScreen } from "@/ui/screens/login-screen";
import { ProspectionScreen } from "@/ui/screens/prospection-screen";
import { RankingScreen } from "@/ui/screens/ranking-screen";
import { ReportScreen } from "@/ui/screens/report-screen";
import { ResourcesScreen } from "@/ui/screens/resources-screen";
import { ScreenSkeleton } from "@/ui/screens/screen-skeleton";
import { SearchScreen } from "@/ui/screens/search-screen";
import { TeamScreen } from "@/ui/screens/team-screen";
import { WelcomeScreen } from "@/ui/screens/welcome-screen";
import { AppShell } from "@/ui/shell/app-shell";
import { createPreviewActions, currentMemberOf } from "./actions";
import type { PreviewSession } from "./session";
import type { PreviewStore } from "./store";

/* ------------------------------------------------------------------ */
/* Routeur en mémoire                                                  */
/* ------------------------------------------------------------------ */

type Route = { pathname: string; searchParams: URLSearchParams };

const parseRoute = (href: string): Route => {
  const url = new URL(href, "https://apercu.invalid");
  return { pathname: url.pathname, searchParams: url.searchParams };
};

/** Rubrique ↔ ancre d'URL simple (`#classement`), seule forme gardée par les liens profonds. */
const hashOf = (pathname: string) => `#${pathname.slice(1) || "accueil"}`;

function initialRoute(): Route {
  try {
    const token = window.location.hash.slice(1);
    if (/^[a-z]+$/.test(token)) return parseRoute(token === "accueil" ? "/" : `/${token}`);
  } catch {
    // Pas d'accès à l'URL : accueil.
  }
  return parseRoute("/");
}

function writeHash(pathname: string) {
  try {
    history.replaceState(null, "", hashOf(pathname));
  } catch {
    // Navigation interne seulement.
  }
}

const NavigateContext = createContext<(href: string) => void>(() => {});

/** Lien interne : navigation sans rechargement (clic du milieu et Ctrl+clic laissés au navigateur). */
function PreviewLink({ href, onClick, children, ...rest }: LinkProps) {
  const navigate = use(NavigateContext);
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(href);
  };
  return (
    <a href={hashOf(parseRoute(href).pathname)} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Résolution d'un écran (mêmes règles d'accès que le site)            */
/* ------------------------------------------------------------------ */

type Resolved = { kind: "redirect"; to: string } | { kind: "screen"; me: Member | null; screen: ReactNode };

async function resolve(route: Route, repository: Repository, session: PreviewSession): Promise<Resolved> {
  const me = await currentMemberOf(repository, session);
  const { pathname } = route;

  if (!me) {
    if (pathname !== "/connexion") return { kind: "redirect", to: "/connexion" };
    return { kind: "screen", me, screen: <LoginScreen choices={await loaders.loadLoginChoices(repository)} /> };
  }
  if (pathname === "/connexion") return { kind: "redirect", to: me.welcomedAt ? "/" : "/bienvenue" };
  if (!me.welcomedAt) {
    if (pathname !== "/bienvenue") return { kind: "redirect", to: "/bienvenue" };
    return { kind: "screen", me, screen: <WelcomeScreen member={summarize(me)} /> };
  }

  const today = todayIso();
  switch (pathname) {
    case "/":
      return { kind: "screen", me, screen: <HomeScreen view={loaders.loadHomeView(me, today)} /> };
    case "/prospection":
      return { kind: "screen", me, screen: <ProspectionScreen view={await loaders.loadProspectionView(repository, me, today)} /> };
    case "/recherche":
      return { kind: "screen", me, screen: <SearchScreen view={await loaders.loadDirectoryView(repository, today)} /> };
    case "/classement":
      return { kind: "screen", me, screen: <RankingScreen view={await loaders.loadRankingView(repository, me, today)} /> };
    case "/bilan": {
      const view = await loaders.loadReportView(repository, me, today, route.searchParams.get("mois"));
      return { kind: "screen", me, screen: <ReportScreen key={view.month} view={view} /> };
    }
    case "/equipe":
      return { kind: "screen", me, screen: <TeamScreen view={await loaders.loadTeamView(repository, me)} /> };
    case "/ressources":
      return { kind: "screen", me, screen: <ResourcesScreen view={await loaders.loadResourcesView(repository, me)} /> };
    case "/agence":
      return { kind: "screen", me, screen: <AgencyScreen /> };
    case "/contrats":
      return { kind: "screen", me, screen: <ContractsScreen view={await loaders.loadContractsView(repository, me, today)} /> };
    case "/guide":
      return { kind: "screen", me, screen: <GuideScreen html={GUIDE_HTML} /> };
    case "/echange":
      return { kind: "screen", me, screen: <ChatScreen view={await loaders.loadMessagesView(repository, me, new Date().toISOString())} /> };
    case "/admin":
      if (!me.isAdmin) return { kind: "redirect", to: "/" };
      return { kind: "screen", me, screen: <AdminScreen view={await loaders.loadAdminView(repository, me, today)} /> };
    case "/activite":
      if (!me.isAdmin) return { kind: "redirect", to: "/" };
      return { kind: "screen", me, screen: <ActivityScreen view={await loaders.loadActivityView(repository, today)} /> };
    default:
      return { kind: "redirect", to: "/" };
  }
}

/* ------------------------------------------------------------------ */
/* Application                                                         */
/* ------------------------------------------------------------------ */

type Props = {
  store: PreviewStore;
  repository: Repository;
  session: PreviewSession;
  download: (file: CsvExport) => Promise<void>;
  fileUrl: (id: string) => string;
  canUpload: boolean;
};

export function PreviewApp({ store, repository, session, download, fileUrl, canUpload }: Props) {
  const revision = useSyncExternalStore(store.subscribe, store.getRevision);
  const [route, setRoute] = useState<Route>(initialRoute);
  // Connexion et déconnexion repartent de zéro : aucun état d'écran ne passe d'un membre à l'autre.
  const [epoch, setEpoch] = useState(0);
  const [resolved, setResolved] = useState<{ me: Member | null; screen: ReactNode; pathname: string } | null>(null);
  const actions = useMemo(() => createPreviewActions(repository, session), [repository, session]);

  const go = useCallback((href: string) => {
    const next = parseRoute(href);
    setRoute(next);
    writeHash(next.pathname);
    window.scrollTo({ top: 0 });
  }, []);
  const reload = useCallback(
    (href: string) => {
      setResolved(null);
      setEpoch((value) => value + 1);
      go(href);
    },
    [go],
  );

  useEffect(() => {
    if (store.status !== "ready") return;
    let cancelled = false;
    resolve(route, repository, session).then(
      (result) => {
        if (cancelled) return;
        if (result.kind === "redirect") go(result.to);
        else setResolved({ me: result.me, screen: result.screen, pathname: route.pathname });
      },
      (error: unknown) => console.error("[aperçu]", error),
    );
    return () => {
      cancelled = true;
    };
    // `revision` : nouvel affichage à chaque changement des données (les vôtres comme celles des autres).
  }, [route, revision, epoch, repository, session, store, go]);

  const me = resolved?.me ?? null;
  const platform = useMemo<Platform>(
    () => ({
      kind: "preview",
      isDemo: true,
      me: me ? summarize(me) : null,
      Link: PreviewLink,
      pathname: route.pathname,
      searchParams: route.searchParams,
      navigate: (href) => go(href),
      reload,
      actions,
      download,
      fileUrl,
      canUpload,
    }),
    [me, route, go, reload, actions, download, fileUrl, canUpload],
  );

  if (store.status === "error") return <Notice title="L'aperçu n'a pas pu charger ses données.">Recharge la page dans un instant.</Notice>;
  // Sans l'accès « Contributeur », la base ne renvoie rien (ni identifiants, ni données) : on explique quoi demander.
  if (store.status === "ready" && !store.canSignIn) {
    return (
      <Notice title="Il te manque l'accès « Contributeur ».">
        Ton lien ouvre cette page en lecture seule : tu ne peux ni te connecter ni voir les données de l&apos;équipe. Demande à Paul de
        t&apos;ajouter avec l&apos;accès « Contributeur » (menu Partager de la page), connecte-toi à claude.ai avec la même adresse,
        puis recharge.
      </Notice>
    );
  }
  if (store.status === "ready" && store.members.size === 0) {
    return <Notice title="Les données d'exemple arrivent.">Elles sont en cours d&apos;installation : recharge la page dans une minute.</Notice>;
  }

  const outside = !me || !me.welcomedAt;
  return (
    <NavigateContext value={go}>
      <PlatformProvider value={platform}>
        <ToastProvider>
          {!resolved ? (
            <Loading />
          ) : outside ? (
            <div key={epoch}>{resolved.screen}</div>
          ) : (
            <AppShell key={epoch}>
              <div key={resolved.pathname} className="screen-in">
                {resolved.screen}
              </div>
            </AppShell>
          )}
        </ToastProvider>
      </PlatformProvider>
    </NavigateContext>
  );
}

export function Loading() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-8 px-4 pt-5 sm:px-6 lg:px-8">
      <span className="opacity-60">
        <BrandMark href={null} />
      </span>
      <ScreenSkeleton />
    </div>
  );
}

export function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-4 text-center">
      <BrandMark href={null} />
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
        <p className="mt-2 text-muted">{children}</p>
      </div>
      <button type="button" onClick={() => window.location.reload()} className={buttonClasses({ variant: "secondary" })}>
        Recharger
      </button>
    </main>
  );
}
