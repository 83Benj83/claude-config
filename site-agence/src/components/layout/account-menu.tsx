"use client";

import { GearIcon, SignOutIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import type { Member } from "@/lib/types";

type Props = {
  member: Pick<Member, "fullName" | "jobTitle" | "avatarUrl" | "isAdmin">;
  signOutAction: () => Promise<void>;
};

export function AccountMenu({ member, signOutAction }: Props) {
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenedOn(null);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpenedOn(null);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpenedOn(open ? null : pathname)}
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
                className="flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm text-muted hover:bg-surface-2 hover:text-fg"
              >
                <GearIcon size={18} aria-hidden />
                Gérer l&apos;équipe
              </Link>
            )}
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm text-muted hover:bg-surface-2 hover:text-fg"
              >
                <SignOutIcon size={18} aria-hidden />
                Se déconnecter
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
