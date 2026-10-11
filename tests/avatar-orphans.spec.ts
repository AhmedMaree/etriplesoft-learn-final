import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { findOrphanFolders, removeOrphanFolders, type OrphanFolder } from "../scripts/lib/avatar-orphans.mjs";

const run = promisify(execFile);

// ---- logic against a fake client (always runs) ----------------------------------------
function fake(options: { users: string[]; root: { name: string; id: string | null }[]; folders: Record<string, string[]>; lateUser?: string }) {
  const removed: string[] = [];
  const admin = {
    auth: {
      admin: {
        listUsers: async () => ({ data: { users: options.users.map((id) => ({ id })) }, error: null }),
        getUserById: async (id: string) => ({ data: { user: id === options.lateUser ? { id } : null }, error: null }),
      },
    },
    storage: {
      from: (bucket: string) => {
        if (bucket !== "avatars") throw new Error(`touched bucket ${bucket}`);
        return {
          list: async (folder: string) => ({
            data: folder === "" ? options.root : (options.folders[folder] ?? []).map((name) => ({ name, id: "o", metadata: { size: 10 }, created_at: "2026-01-01" })),
            error: null,
          }),
          remove: async (paths: string[]) => { removed.push(...paths); return { data: paths.map((name) => ({ name })), error: null }; },
        };
      },
    },
  };
  return { admin: admin as unknown as SupabaseClient, removed };
}

test("only UUID folders without an auth user are orphans", async () => {
  const live = randomUUID();
  const orphan = randomUUID();
  const { admin } = fake({
    users: [live],
    root: [{ name: live, id: null }, { name: orphan, id: null }, { name: "not-a-uuid", id: null }, { name: "loose.png", id: "file" }],
    folders: { [live]: ["avatar"], [orphan]: ["avatar"], "not-a-uuid": ["x"] },
  });
  const { orphans, skipped } = await findOrphanFolders(admin);
  expect(orphans.map((o: OrphanFolder) => o.folder)).toEqual([orphan]);
  expect(skipped.sort()).toEqual(["loose.png", "not-a-uuid"]);
});

test("removal re-checks the user, refuses non-UUID folders, and stays inside the folder", async () => {
  const orphan = randomUUID();
  const lateUser = randomUUID();
  const { admin, removed } = fake({ users: [], root: [], folders: {}, lateUser });
  const file = { name: "avatar", size: 1, createdAt: null };

  await expect(removeOrphanFolders(admin, [{ folder: "../escape", files: [file] }])).rejects.toThrow(/non-UUID/);
  await expect(removeOrphanFolders(admin, [{ folder: lateUser, files: [file] }])).rejects.toThrow(/now has a user/);
  expect(removed).toEqual([]);

  expect(await removeOrphanFolders(admin, [{ folder: orphan, files: [file] }])).toBe(1);
  expect(removed).toEqual([`${orphan}/avatar`]);
});

// ---- hosted DEV, real Storage + CLI (needs the process-only key) -----------------------
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test("hosted DEV: dry run lists only UUID orphans and deletes nothing; apply needs a matching --expect", async () => {
  test.setTimeout(120000);
  test.skip(!url || !serviceKey, "Needs the Supabase URL and a process-only service-role key.");
  const service = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/VsgAAAAASUVORK5CYII=", "base64");
  const orphan = randomUUID();
  const notUuid = `codex-not-a-uuid-${Date.now()}`;
  const { data: live, error } = await service.auth.admin.createUser({ email: `codex-orphan-${Date.now()}@example.test`, password: `Aa1-${randomUUID()}`, email_confirm: true });
  if (error || !live.user) throw new Error(`createUser failed: ${error?.message}`);
  const keys = [`${orphan}/avatar`, `${notUuid}/avatar`, `${live.user.id}/avatar`];
  const env = { ...process.env, SUPABASE_DEV_PROJECT_REF: new URL(url!).hostname.split(".")[0] };
  const cli = (...args: string[]) => run("node", ["scripts/cleanup-orphan-avatars.mjs", ...args], { env }).then(
    (r) => ({ code: 0, out: r.stdout }),
    (e: { code: number; stdout: string; stderr: string }) => ({ code: e.code, out: e.stdout + e.stderr }),
  );
  // Use the listing, not download: downloads can be served from a CDN cache after removal.
  const exists = async (key: string) => {
    const [folder, name] = key.split("/");
    const { data } = await service.storage.from("avatars").list(folder);
    return (data ?? []).some((entry) => entry.name === name);
  };

  try {
    for (const key of keys) expect((await service.storage.from("avatars").upload(key, png, { contentType: "image/png" })).error).toBeNull();

    const dry = await cli("--json");
    expect(dry.code).toBe(0);
    const report = JSON.parse(dry.out.trim().split("\n").at(-1)!);
    expect(report.mode).toBe("dry-run");
    const found = report.orphans.map((o: OrphanFolder) => o.folder);
    expect(found).toContain(orphan);
    expect(found).not.toContain(notUuid);
    expect(found).not.toContain(live.user.id);
    expect(report.skipped).toContain(notUuid);
    for (const key of keys) expect(await exists(key)).toBe(true);

    const refused = await cli("--apply");
    expect(refused.code).not.toBe(0);
    const mismatch = await cli("--apply", `--expect=${found.length + 7}`);
    expect(mismatch.code).toBe(1);
    expect(mismatch.out).toMatch(/Nothing deleted/);
    for (const key of keys) expect(await exists(key)).toBe(true);

    // Remove only our own orphan through the library (other orphans may exist in the bucket).
    const mine = report.orphans.filter((o: OrphanFolder) => o.folder === orphan);
    expect(await removeOrphanFolders(service, mine)).toBe(1);
    expect(await exists(`${orphan}/avatar`)).toBe(false);
    expect(await exists(`${notUuid}/avatar`)).toBe(true);
    expect(await exists(`${live.user.id}/avatar`)).toBe(true);
  } finally {
    await service.storage.from("avatars").remove(keys);
    await service.auth.admin.deleteUser(live.user.id);
  }
});
