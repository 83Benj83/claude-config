"use client";

import { ArrowLeftIcon, EyeIcon, EyeSlashIcon, MagnifyingGlassIcon, SignInIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { site } from "@/config/site";
import { normalizeText } from "@/lib/establishments";
import type { LoginChoice } from "@/lib/types";
import { usePlatform } from "../platform";
import { Avatar } from "../primitives/avatar";
import { buttonClasses } from "../primitives/button";
import { controlClasses, FormMessage } from "../primitives/field";
import { ThemeToggle } from "../shell/theme-toggle";

const REMEMBERED_LOGIN = "dernier-identifiant";
/** Au-delà, un champ de filtre aide à trouver son identifiant. */
const FILTER_THRESHOLD = 8;

function rememberedLogin(): string | null {
  try {
    return localStorage.getItem(REMEMBERED_LOGIN);
  } catch {
    return null;
  }
}

function rememberLogin(login: string) {
  try {
    localStorage.setItem(REMEMBERED_LOGIN, login);
  } catch {
    // Stockage indisponible : on redemandera l'identifiant la prochaine fois.
  }
}

/**
 * Connexion en deux temps : choisir son identifiant dans la liste définie par
 * l'admin, puis entrer le mot de passe reçu. L'appareil retient le dernier
 * identifiant utilisé.
 */
export function LoginScreen({ choices, demoAccounts }: { choices: LoginChoice[]; demoAccounts?: { login: string; password: string }[] }) {
  const { actions, reload } = usePlatform();
  const [selected, setSelected] = useState<LoginChoice | null>(null);
  const [filter, setFilter] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const passwordRef = useRef<HTMLInputElement>(null);

  // Présélection du dernier identifiant utilisé sur cet appareil.
  useEffect(() => {
    const login = rememberedLogin();
    const match = login ? choices.find((choice) => choice.login === login) : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique du stockage du navigateur au montage
    if (match) setSelected(match);
  }, [choices]);

  useEffect(() => {
    if (selected) passwordRef.current?.focus();
  }, [selected]);

  const visible = useMemo(() => {
    const query = normalizeText(filter);
    if (!query) return choices;
    return choices.filter((choice) => normalizeText(`${choice.fullName} ${choice.login}`).includes(query));
  }, [choices, filter]);

  const choose = (choice: LoginChoice) => {
    setSelected(choice);
    setPassword("");
    setError(null);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    start(async () => {
      const result = await actions.signIn({ login: selected.login, password });
      if (!result.ok) {
        setError(result.errors?.password ?? result.message ?? "Connexion impossible.");
        setPassword("");
        passwordRef.current?.focus();
        return;
      }
      rememberLogin(selected.login);
      reload(result.data.next);
    });
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="dot-grid relative hidden flex-col justify-between overflow-hidden border-r border-line bg-surface-2 p-10 lg:flex xl:p-14">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-[11px] bg-accent text-sm font-bold text-on-accent">{site.monogram}</span>
          <span className="text-base font-semibold tracking-tight text-fg">{site.name}</span>
        </div>
        <div className="max-w-md">
          <p className="text-4xl font-semibold leading-[1.05] tracking-tighter text-fg xl:text-5xl">L&apos;espace de prospection de l&apos;équipe.</p>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            Ajoute tes prospects, vérifie qu&apos;un restaurant n&apos;a pas déjà été contacté et suis le classement en direct.
          </p>
        </div>
        <p className="text-sm text-subtle">{site.tagline}</p>
        <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-24 size-72 rounded-full bg-accent/15 blur-3xl" />
      </aside>

      <div className="flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 sm:px-8">
          <span className="flex items-center gap-2.5 lg:invisible">
            <span className="grid size-8 place-items-center rounded-[10px] bg-accent text-[0.8125rem] font-bold text-on-accent">{site.monogram}</span>
            <span className="text-[0.9375rem] font-semibold tracking-tight text-fg">{site.name}</span>
          </span>
          <ThemeToggle />
        </div>

        <main className="flex flex-1 justify-center px-4 pt-4 pb-16 sm:px-8 lg:items-center">
          <div className="w-full max-w-lg">
            {selected ? (
              <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="inline-flex w-fit items-center gap-1.5 rounded-full text-sm font-medium text-muted hover:text-fg"
                >
                  <ArrowLeftIcon size={16} aria-hidden />
                  Changer d&apos;identifiant
                </button>
                <div className="flex items-center gap-4">
                  <Avatar member={selected} size="lg" highlight />
                  <div className="min-w-0">
                    <h1 className="truncate text-2xl font-semibold tracking-tight text-fg">Bonjour {selected.fullName.split(" ")[0]}</h1>
                    <p className="text-sm text-subtle">Identifiant : @{selected.login}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-fg">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <input
                      ref={passwordRef}
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? "password-error" : "password-hint"}
                      className={`${controlClasses} h-12 pr-12 text-base`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? <EyeSlashIcon size={18} aria-hidden /> : <EyeIcon size={18} aria-hidden />}
                    </button>
                  </div>
                  <p id="password-hint" className="text-xs text-subtle">
                    C&apos;est le mot de passe qu&apos;on t&apos;a donné pour cet identifiant.
                  </p>
                </div>
                {error && (
                  <div id="password-error">
                    <FormMessage>{error}</FormMessage>
                  </div>
                )}
                <button type="submit" disabled={pending || password === ""} className={buttonClasses({ size: "lg", className: "w-full" })}>
                  <SignInIcon size={18} weight="bold" aria-hidden />
                  {pending ? "Connexion…" : "Se connecter"}
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-6">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tighter text-fg">Connexion</h1>
                  <p className="mt-2 text-muted">Choisis ton identifiant, puis entre le mot de passe qu&apos;on t&apos;a donné.</p>
                </div>
                {choices.length > FILTER_THRESHOLD && (
                  <div className="relative">
                    <MagnifyingGlassIcon size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-subtle" aria-hidden />
                    <input
                      type="search"
                      value={filter}
                      onChange={(event) => setFilter(event.target.value)}
                      placeholder="Chercher mon prénom"
                      aria-label="Filtrer les identifiants"
                      className={`${controlClasses} h-11 pl-10`}
                    />
                  </div>
                )}
                {choices.length === 0 ? (
                  <FormMessage tone="info">Aucun identifiant n&apos;est encore créé. Un administrateur doit en ajouter.</FormMessage>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2" aria-label="Identifiants">
                    {visible.map((choice) => (
                      <li key={choice.id}>
                        <button
                          type="button"
                          onClick={() => choose(choice)}
                          className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition-[border-color,box-shadow,transform] duration-200 hover:border-line-strong hover:shadow-card active:scale-[0.99]"
                        >
                          <Avatar member={choice} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-fg">{choice.fullName}</span>
                            <span className="block truncate text-xs text-subtle">@{choice.login}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                    {visible.length === 0 && <li className="text-sm text-muted">Aucun identifiant ne correspond.</li>}
                  </ul>
                )}
                {demoAccounts && demoAccounts.length > 0 && (
                  <div className="rounded-2xl border border-dashed border-line-strong p-4 text-sm text-muted">
                    <p className="font-medium text-fg">Comptes de démonstration</p>
                    <p className="mt-1">Chaque identifiant a son propre mot de passe : l’identifiant suivi de 2026 (ex. ines2026).</p>
                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
                      {demoAccounts.slice(0, 4).map((account) => (
                        <li key={account.login}>
                          {account.login} / {account.password}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
