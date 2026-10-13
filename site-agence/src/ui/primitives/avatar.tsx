import { initials } from "@/lib/stats";
import type { Member } from "@/lib/types";

const SIZES = {
  xs: "size-7 text-[0.6875rem]",
  sm: "size-9 text-xs",
  md: "size-11 text-sm",
  lg: "size-14 text-base",
  xl: "size-20 text-xl",
} as const;

type Props = {
  member: Pick<Member, "fullName" | "avatarUrl">;
  size?: keyof typeof SIZES;
  /** Anneau d'accent pour mettre en avant (podium, membre connecté). */
  highlight?: boolean;
  className?: string;
};

export function Avatar({ member, size = "md", highlight = false, className = "" }: Props) {
  const ring = highlight ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : "";
  const classes = `${SIZES[size]} ${ring} relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-inverse font-semibold tracking-tight text-on-inverse ${className}`;

  if (member.avatarUrl) {
    return (
      <span className={classes}>
        {/* URL libre saisie par un admin : pas de domaine connu pour next/image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={member.avatarUrl} alt="" className="size-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
      </span>
    );
  }

  return (
    <span className={classes} aria-hidden>
      {initials(member.fullName)}
    </span>
  );
}
