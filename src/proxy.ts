import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { defaultLocale, isLocale } from "./i18n/config";
import { safeReturnPath } from "./lib/supabase/auth-redirects";
import { updateSession } from "./lib/supabase/proxy";

const handleI18nRouting = createMiddleware(routing);
// Only signed-in app pages explain the sign-out. Public pages, server actions and non-GET requests
// continue signed out, and their own checks respond.
function expiredRedirect(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [first, page] = pathname.slice(1).split("/");
  const locale = first && isLocale(first) ? first : defaultLocale;
  if (request.method !== "GET" || request.headers.has("next-action")) return null;
  // A payment return keeps its order so the learner lands back on the confirmation after signing in.
  const params = request.nextUrl.searchParams;
  const order = params.get("order");
  const wanted =
    page === "payment" && order
      ? `${pathname}?order=${order}&step=checkout${params.get("returned") === "1" ? "&returned=1" : ""}`
      : pathname;
  let next = page === "admin" ? `/${locale}/admin` : safeReturnPath(locale, wanted);
  if (next !== wanted && wanted !== pathname) next = safeReturnPath(locale, pathname);
  if (page !== "admin" && next !== pathname && next !== wanted) return null;
  const login = new URL(`/${locale}/login`, request.url);
  login.searchParams.set("next", next);
  login.searchParams.set("notice", "sessionExpired");
  return NextResponse.redirect(login);
}

export default async function proxy(request: NextRequest) {
  const session = await updateSession(request);
  const sessionResponse = session.response;

  // Admin APIs only pass through for session refresh and the session policy.
  const isApi = request.nextUrl.pathname.startsWith("/api/");
  const response: NextResponse =
    (session.expired && !isApi && expiredRedirect(request)) || (isApi ? sessionResponse : handleI18nRouting(request));

  if (response !== sessionResponse) {
    sessionResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    for (const name of ["cache-control", "expires", "pragma"]) {
      const value = sessionResponse.headers.get(name);
      if (value) response.headers.set(name, value);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)", "/api/admin/:path*", "/api/learning/quiz/author"],
};
