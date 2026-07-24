import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/cookie";

// DE-06: Die Middleware prueft NUR die Cookie-Existenz (Edge-Runtime, kein
// DB-Zugriff). Die echte Pruefung — Gueltigkeit, isActive, Rolle — passiert in
// requireUser() / requireAdmin() an jedem Route-Einstieg.
export function middleware(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSession) {
    // AK-3: Nicht angemeldeter Zugriff auf geschuetzte Routen → /login.
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Alles schuetzen ausser /login, Next-Interna und statischen Dateien.
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
