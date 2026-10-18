import fs from "node:fs";
import path from "node:path";

/**
 * Chromium for Playwright. Order: PLAYWRIGHT_CHROMIUM_EXECUTABLE, then an installed
 * Windows headless shell under %LOCALAPPDATA%\ms-playwright, then Playwright's own browser.
 */
export function chromiumExecutable(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const base = process.env.LOCALAPPDATA;
  if (!base) return undefined;
  const root = path.join(base, "ms-playwright");
  if (!fs.existsSync(root)) return undefined;
  const dir = fs
    .readdirSync(root)
    .filter((name) => name.startsWith("chromium_headless_shell-"))
    .sort()
    .pop();
  if (!dir) return undefined;
  const exe = path.join(root, dir, "chrome-headless-shell-win64", "chrome-headless-shell.exe");
  return fs.existsSync(exe) ? exe : undefined;
}

/** Cross-platform dev-server command (no npm.cmd). */
export const nextDevCommand = (port: string | number) =>
  `npx next dev --hostname 127.0.0.1 --port ${port}`;
