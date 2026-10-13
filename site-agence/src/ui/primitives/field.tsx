"use client";

import { useId, type ComponentProps, type ReactNode } from "react";

export const controlClasses =
  "w-full rounded-xl border border-line-input bg-surface px-3.5 text-[0.9375rem] text-fg transition-colors placeholder:text-subtle focus:border-accent aria-[invalid=true]:border-danger disabled:opacity-60";

type FieldShellProps = {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
  optional?: boolean;
};

/** Libellé au-dessus, aide puis erreur en dessous (jamais de libellé dans le placeholder). */
function FieldShell({ id, label, hint, error, className = "", children, optional }: FieldShellProps) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        {optional && <span className="font-normal text-subtle"> (facultatif)</span>}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const describedBy = (id: string, hint?: ReactNode, error?: string) =>
  [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

type Common = { label: ReactNode; hint?: ReactNode; error?: string; optional?: boolean; containerClassName?: string };

export function Field({ label, hint, error, optional, containerClassName, className = "", id: givenId, ...input }: Common & ComponentProps<"input">) {
  const generated = useId();
  const id = givenId ?? generated;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} className={containerClassName}>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
        className={`${controlClasses} h-11 ${className}`}
        {...input}
      />
    </FieldShell>
  );
}

export function TextArea({ label, hint, error, optional, containerClassName, className = "", id: givenId, ...input }: Common & ComponentProps<"textarea">) {
  const generated = useId();
  const id = givenId ?? generated;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} className={containerClassName}>
      <textarea
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
        className={`${controlClasses} min-h-24 py-2.5 leading-relaxed ${className}`}
        {...input}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  optional,
  containerClassName,
  className = "",
  id: givenId,
  children,
  ...select
}: Common & ComponentProps<"select">) {
  const generated = useId();
  const id = givenId ?? generated;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} className={containerClassName}>
      <select
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
        className={`${controlClasses} h-11 ${className}`}
        {...select}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function FormMessage({ tone = "error", children }: { tone?: "error" | "info"; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl px-3.5 py-3 text-sm ${tone === "error" ? "bg-danger-soft text-danger" : "bg-surface-2 text-muted"}`}
    >
      {children}
    </p>
  );
}

export function Checkbox({
  label,
  hint,
  checked,
  onChange,
  id: givenId,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}) {
  const generated = useId();
  const id = givenId ?? generated;
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]"
      />
      <label htmlFor={id} className="text-sm">
        <span className="block font-medium text-fg">{label}</span>
        {hint && (
          <span id={`${id}-hint`} className="block text-subtle">
            {hint}
          </span>
        )}
      </label>
    </div>
  );
}
