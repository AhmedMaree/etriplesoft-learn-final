import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/proxy";

const handleI18nRouting = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const sessionResponse = await updateSession(request);

  const response: NextResponse = handleI18nRouting(request);

  sessionResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  for (const name of ["cache-control", "expires", "pragma"]) {
    const value = sessionResponse.headers.get(name);
    if (value) response.headers.set(name, value);
  }

  return response;
}

export const config = {
  matcher: "/((?!api|_next|.*\\..*).*)",
};
