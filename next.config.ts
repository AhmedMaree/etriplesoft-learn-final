import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Allows isolated local QA servers to avoid the user's active .next/dev lock.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // Hide the floating Next.js "N" dev-tools badge in local development.
  devIndicators: false,
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
