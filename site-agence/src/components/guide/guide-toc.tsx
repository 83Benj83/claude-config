"use client";

import { useEffect, useState } from "react";
import type { GuideHeading } from "@/lib/guide";

/** Sommaire avec suivi de la section lue (IntersectionObserver, pas d'écouteur de scroll). */
export function GuideToc({ headings }: { headings: GuideHeading[] }) {
  const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null);

  useEffect(() => {
    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -65% 0px" },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  return (
    <nav aria-label="Sommaire du guide">
      <p className="mb-3 text-sm font-semibold text-fg">Sommaire</p>
      <ol className="flex flex-col border-l border-line">
        {headings.map((heading) => {
          const active = heading.id === activeId;
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                aria-current={active ? "location" : undefined}
                className={`-ml-px block border-l-2 py-1.5 pl-4 text-sm transition-colors ${
                  active ? "border-accent font-medium text-fg" : "border-transparent text-muted hover:text-fg"
                }`}
              >
                {heading.title}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
