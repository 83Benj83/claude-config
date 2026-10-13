"use client";

import { GearIcon, SignOutIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useId, useTransition, type FormEvent } from "react";
import { Avatar } from "@/components/avatar";
import type { Member } from "@/lib/types";
import { useDisclosure } from "./use-disclosure";

type Props = {
  member: Pick<Member, "fullName" | "jobTitle" | "avatarUrl" | "isAdmin">;
  signOutAction: () => Promise<void>;
};

export function AccountMenu({ member, signOutAction }: Props) {
  const { open, toggle, close, triggerRef, rootRef, onBlurCapture } = useDisclosure();
  const menuId = useId();
  const [signingOut, startSignOut] = useTransition();

  // Rechargement complet après la déconnexion : aucun état (formulaires,
  // pages gardées en mémoire) ne passe d'un membre à l'autre.
  const onSignOut = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startSignOut(async () => {
      await signOutAction();
      window.location.replace(new URL("/connexion", window.location.origin).href);
    });
  };

  return (
    <div ref={rootRef} className="relative" onBlurCapture={onBlurCapture}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Compte de ${member.fullName}`}
        className="rounded-full transition-transform active:scale-95"
      >
        <Avatar member={member} size="sm" />
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-2xl border border-line bg-surface p-2 shadow-pop"
        >
          <div className="px-3 pt-2 pb-3">
            <p className="truncate text-sm font-semibold text-fg">{member.fullName}</p>
            <p className="truncate text-sm text-subtle">{member.jobTitle}</p>
          </div>
          <div className="border-t border-line pt-2">
            {member.isAdmin && (
              <Link
                href="/admin"
                onClick={() => close()}
                className="flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm text-muted hover:bg-surface-2 hover:text-fg"
              >
                <GearIcon size={18} aria-hidden />
                Gérer l&apos;équipe
              </Link>
            )}
            <form action={signOutAction} onSubmit={onSignOut}>
              <button
                type="submit"
                disabled={signingOut}
                className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-60"
              >
                <SignOutIcon size={18} aria-hidden />
                {signingOut ? "Déconnexion…" : "Se déconnecter"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
