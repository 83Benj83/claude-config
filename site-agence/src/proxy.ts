import { NextResponse, type NextRequest } from "next/server";
import { ConfigurationError, resolveRuntimeMode } from "@/lib/runtime-mode";

/** Pages accessibles sans être connecté. */
const PUBLIC_PATHS = ["/connexion"];

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

/**
 * Vérification optimiste : sans cookie de session, on renvoie vers la
 * connexion. La vraie vérification (signature, identifiant actif) est
 * refaite dans chaque page et chaque Server Action.
 */
export function proxy(request: NextRequest) {
  try {
    resolveRuntimeMode(process.env);
  } catch (error) {
    if (!(error instanceof ConfigurationError)) throw error;
    // Mauvaise configuration : on bloque plutôt que de basculer en mode démo.
    console.error("[proxy]", error.message);
    return new NextResponse("Site mal configuré : voir les journaux du serveur.", { status: 503 });
  }

  const hasSession = request.cookies.has("session");
  if (!hasSession && !isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Tout sauf les fichiers statiques, les images optimisées et les icônes.
    "/((?!_next/static|_next/image|icon.svg|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml)$).*)",
  ],
};
