import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Allows isolated local QA servers to avoid the user's active .next/dev lock.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
