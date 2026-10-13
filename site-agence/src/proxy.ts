import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ConfigurationError, resolveRuntimeMode, type RuntimeMode } from "@/lib/runtime-mode";

/** Pages accessibles sans être connecté. */
const PUBLIC_PATHS = ["/connexion", "/inscription"];

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

/**
 * Vérification optimiste de la session et rafraîchissement des cookies Supabase.
 * La vraie autorisation est refaite dans chaque page et Server Action.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let mode: RuntimeMode;
  try {
    mode = resolveRuntimeMode(process.env);
  } catch (error) {
    if (!(error instanceof ConfigurationError)) throw error;
    // Mauvaise configuration : on bloque plutôt que de basculer en mode démo.
    console.error("[proxy]", error.message);
    return new NextResponse("Site mal configuré : voir les journaux du serveur.", { status: 503 });
  }

  let response = NextResponse.next({ request });
  let isSignedIn: boolean;

  if (mode.kind === "supabase") {
    const supabase = createServerClient(mode.config.url, mode.config.publishableKey, {
      cookieOptions: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
          for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
        },
      },
    });
    const { data } = await supabase.auth.getClaims();
    isSignedIn = Boolean(data?.claims?.sub);
  } else {
    isSignedIn = request.cookies.has("demo_member");
  }

  if (!isSignedIn && !isPublicPath(pathname)) {
    const loginUrl = new URL("/connexion", request.url);
    return redirectWithCookies(loginUrl, response);
  }
  return response;
}

/** Conserve les cookies de session rafraîchis lors d'une redirection. */
function redirectWithCookies(target: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(target);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: [
    // Tout sauf les fichiers statiques, les images optimisées et les icônes.
    "/((?!_next/static|_next/image|icon.svg|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml)$).*)",
  ],
};
