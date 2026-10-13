"use client";

import { m } from "motion/react";
import { MotionRoot } from "@/components/motion/motion-root";
import type { ReactNode } from "react";

/**
 * Apparition douce à l'entrée dans l'écran : guide l'œil section par section.
 * Désactivée si l'utilisateur préfère réduire les animations.
 */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <MotionRoot>
      <m.div
        className={className}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </m.div>
    </MotionRoot>
  );
}
