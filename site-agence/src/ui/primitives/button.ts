type Variant = "primary" | "secondary" | "ghost" | "inverse";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-[var(--ease-out-expo)] active:translate-y-px active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] hover:brightness-105 hover:shadow-pop",
  secondary: "border border-line-strong bg-surface text-fg hover:border-fg/40 hover:bg-surface-2",
  ghost: "text-muted hover:bg-surface-2 hover:text-fg",
  inverse: "bg-inverse text-on-inverse hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-12 px-6 text-base",
};

/** Classes des boutons et liens-boutons (forme pilule, un seul accent). */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className = "",
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`.trim();
}
