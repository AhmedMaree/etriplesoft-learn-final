import { spawn } from "node:child_process";
import http from "node:http";

const proxyPort = 3219;
const proxyHost = "127.0.0.1";
let holdRpc = true;
let pending = 0;
let calls = 0;
const releaseWaiters = [];

function json(response, status, value) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value));
}

const proxy = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${proxyHost}:${proxyPort}`);

  if (url.pathname === "/__test/health") {
    return json(response, 200, { ok: true });
  }
  if (url.pathname === "/__test/status") {
    return json(response, 200, { held: holdRpc, pending, calls });
  }
  if (url.pathname === "/__test/reset" && request.method === "POST") {
    holdRpc = true;
    pending = 0;
    calls = 0;
    return json(response, 200, { ok: true });
  }
  if (url.pathname === "/__test/release" && request.method === "POST") {
    holdRpc = false;
    while (releaseWaiters.length) releaseWaiters.shift()?.();
    return json(response, 200, { ok: true });
  }
  if (!url.pathname.startsWith("/rest/v1/rpc/")) {
    return json(response, 404, { message: "Unknown isolated test endpoint" });
  }

  calls += 1;
  if (holdRpc) {
    pending += 1;
    await new Promise((resolve) => releaseWaiters.push(resolve));
    pending -= 1;
  }

  const rpc = url.pathname.slice("/rest/v1/rpc/".length);
  if (rpc === "catalog_list_categories" || rpc === "catalog_search_courses") {
    return json(response, 200, []);
  }
  if (rpc === "catalog_count_courses") {
    return json(response, 200, 0);
  }
  return json(response, 404, { message: "Unexpected RPC in isolated loading test" });
});

await new Promise((resolve, reject) => {
  proxy.once("error", reject);
  proxy.listen(proxyPort, proxyHost, resolve);
});

const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: `http://${proxyHost}:${proxyPort}`,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_phase09_loading_test_only",
  NEXT_DIST_DIR: "tmp/phase09-loading-next",
};
const next = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3012"],
  { cwd: process.cwd(), env, stdio: "inherit", windowsHide: true },
);

function shutdown() {
  next.kill();
  proxy.close();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
next.once("exit", (code) => {
  proxy.close();
  process.exitCode = code ?? 1;
});
