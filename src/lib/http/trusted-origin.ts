import "server-only";

/** Cookie-authenticated mutations use the operator-configured app origin, never Host headers. */
export function hasTrustedRequestOrigin(request: Request): boolean {
  const configured =
    process.env.AUTH_SITE_URL?.trim() ||
    (process.env.NODE_ENV === "development" ? "http://127.0.0.1:3010" : "");
  if (!configured) return false;
  try {
    const origin = new URL(configured);
    if (
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash
    )
      return false;
    if (
      origin.protocol !== "https:" &&
      !(
        origin.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(origin.hostname)
      )
    )
      return false;
    return request.headers.get("origin") === origin.origin;
  } catch {
    return false;
  }
}
