import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: no session cookie → send to /login. The real check (cookie → database session)
// happens in requireUser() on every page and server action.

const PUBLIC = ["/login", "/auth/"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p))) return NextResponse.next();
  if (!request.cookies.has("kd_session")) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|api/|favicon.ico|icon.png|.*\\.(?:png|jpg|svg|ico|webp)$).*)"],
};
