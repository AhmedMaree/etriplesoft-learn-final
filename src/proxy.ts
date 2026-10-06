import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const overviewAlias = path === "/overview" || /^\/(en|ar)\/overview$/.test(path);

  if (overviewAlias) {
    const locale = path.startsWith("/ar/") ? "ar" : "en";
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url, 308);
  }

  return handleI18nRouting(request);
}

export const config = {
  matcher: "/((?!api|_next|.*\\..*).*)",
};
