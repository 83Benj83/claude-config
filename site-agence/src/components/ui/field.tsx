import { useId, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

/** Champ de formulaire : libellé au-dessus, aide et erreur en dessous. */
export function Field({ label, error, hint, className = "", ...input }: Props) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className="h-11 rounded-xl border border-line-input bg-surface px-3.5 text-[0.9375rem] text-fg transition-colors placeholder:text-subtle focus:border-accent aria-[invalid=true]:border-danger"
        {...input}
      />
      {hint && (
        <p id={hintId} className="text-sm text-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger">
      {message}
    </p>
  );
}
