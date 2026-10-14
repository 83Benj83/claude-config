"use client";

import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { createContext, use, useCallback, useRef, useState, type ReactNode } from "react";

type Toast = { id: number; tone: "success" | "error"; message: string };

const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

/**
 * Confirmations brèves (« Ajouté », « Copié »). Une seule zone `aria-live`,
 * placée au-dessus de la barre du bas sur téléphone.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const show = useCallback((message: string, tone: Toast["tone"] = "success") => {
    nextId.current += 1;
    const id = nextId.current;
    setToasts((current) => [...current.slice(-2), { id, tone, message }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), tone === "error" ? 6000 : 3200);
  }, []);

  return (
    <ToastContext value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] z-[60] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <p
            key={toast.id}
            className="toast-in pointer-events-auto flex max-w-md items-center gap-2 rounded-full bg-inverse px-4 py-2.5 text-sm font-medium text-on-inverse shadow-pop"
          >
            {toast.tone === "success" ? (
              <CheckCircleIcon size={18} weight="fill" className="shrink-0 text-success-on-inverse" aria-hidden />
            ) : (
              <WarningCircleIcon size={18} weight="fill" className="shrink-0 text-danger-on-inverse" aria-hidden />
            )}
            {toast.message}
          </p>
        ))}
      </div>
    </ToastContext>
  );
}

export const useToast = () => use(ToastContext);
