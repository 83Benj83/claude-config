import { Suspense } from "react";
import { Hero } from "@/components/home/hero";
import { LiveFigures, LiveFiguresSkeleton } from "@/components/home/live-figures";
import { Method } from "@/components/home/method";
import { Services } from "@/components/home/services";
import { TeamTeaser } from "@/components/home/team-teaser";
import { Closing, Values } from "@/components/home/values-closing";

export default function HomePage() {
  return (
    <>
      <Hero />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<LiveFiguresSkeleton />}>
          <LiveFigures />
        </Suspense>
      </div>
      <Services />
      <Method />
      <div className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-8">
        <Suspense fallback={<div className="skeleton h-72 rounded-2xl" aria-hidden />}>
          <TeamTeaser />
        </Suspense>
      </div>
      <Values />
      <Closing />
    </>
  );
}
