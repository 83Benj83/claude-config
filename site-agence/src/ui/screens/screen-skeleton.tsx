import { Skeleton } from "../primitives/surface";

/** Squelette d'écran affiché pendant le chargement des données. */
export function ScreenSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Chargement">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-64 lg:col-span-8" />
        <Skeleton className="h-64 lg:col-span-4" />
      </div>
      <Skeleton className="h-40" />
    </div>
  );
}
