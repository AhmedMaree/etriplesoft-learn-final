import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AvatarCleanupError, deleteAccountWithAvatar } from "../src/lib/supabase/account-deletion";

type Entry = { name: string; id: string | null };

function fakeAdmin(options: {
  files?: readonly Entry[];
  listError?: string;
  removeError?: string;
  removeReturnsFewer?: boolean;
  removeLeavesFiles?: boolean;
  deleteError?: string;
}) {
  const calls: string[] = [];
  let files = [...(options.files ?? [])];
  const admin = {
    storage: {
      from: (bucket: string) => ({
        list: async (folder: string) => {
          calls.push(`list:${bucket}/${folder}`);
          return options.listError ? { data: null, error: { message: options.listError } } : { data: files, error: null };
        },
        remove: async (paths: string[]) => {
          calls.push(`remove:${paths.join(",")}`);
          if (options.removeError) return { data: null, error: { message: options.removeError } };
          if (!options.removeLeavesFiles) files = [];
          return { data: (options.removeReturnsFewer ? paths.slice(1) : paths).map((name) => ({ name })), error: null };
        },
      }),
    },
    auth: {
      admin: {
        deleteUser: async (id: string) => {
          calls.push(`deleteUser:${id}`);
          return { error: options.deleteError ? { message: options.deleteError } : null };
        },
      },
    },
  };
  return { admin: admin as unknown as SupabaseClient, calls };
}

const id = randomUUID();
const avatar: Entry = { name: "avatar", id: "obj-1" };

test("avatar files are removed before the user is deleted", async () => {
  const { admin, calls } = fakeAdmin({ files: [avatar] });
  const result = await deleteAccountWithAvatar(admin, id);
  expect(result.removedObjects).toBe(1);
  const removeAt = calls.findIndex((call) => call.startsWith("remove:"));
  const deleteAt = calls.findIndex((call) => call.startsWith("deleteUser:"));
  expect(removeAt).toBeGreaterThanOrEqual(0);
  expect(deleteAt).toBeGreaterThan(removeAt);
  expect(calls[removeAt]).toBe(`remove:${id}/avatar`);
});

test("an account without an avatar is deleted without a remove call", async () => {
  const { admin, calls } = fakeAdmin({ files: [] });
  expect((await deleteAccountWithAvatar(admin, id)).removedObjects).toBe(0);
  expect(calls.some((call) => call.startsWith("remove:"))).toBe(false);
  expect(calls).toContain(`deleteUser:${id}`);
});

for (const [label, options] of [
  ["listing fails", { files: [avatar], listError: "list down" }],
  ["removal fails", { files: [avatar], removeError: "remove denied" }],
  ["removal is incomplete", { files: [avatar], removeReturnsFewer: true }],
  ["files remain after removal", { files: [avatar], removeLeavesFiles: true }],
] as const) {
  test(`deletion aborts and keeps the user when ${label}`, async () => {
    const { admin, calls } = fakeAdmin(options);
    await expect(deleteAccountWithAvatar(admin, id)).rejects.toBeInstanceOf(AvatarCleanupError);
    expect(calls.some((call) => call.startsWith("deleteUser:"))).toBe(false);
  });
}

test("deletion refuses a non-UUID id before touching anything", async () => {
  const { admin, calls } = fakeAdmin({ files: [avatar] });
  await expect(deleteAccountWithAvatar(admin, "../other-folder")).rejects.toBeInstanceOf(AvatarCleanupError);
  expect(calls).toEqual([]);
});

test("a user-delete failure is reported after the files were removed", async () => {
  const { admin } = fakeAdmin({ files: [avatar], deleteError: "auth down" });
  await expect(deleteAccountWithAvatar(admin, id)).rejects.toThrow(/Could not delete user/);
});

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test("hosted DEV: deleting an account removes its avatar object and the user", async () => {
  test.skip(!url || !serviceKey, "Needs the Supabase URL and a process-only service-role key.");
  const service = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  const email = `codex-delete-${Date.now()}@example.test`;
  const { data, error } = await service.auth.admin.createUser({ email, password: `Aa1-${randomUUID()}`, email_confirm: true });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  const userId = data.user.id;
  try {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/VsgAAAAASUVORK5CYII=", "base64");
    const upload = await service.storage.from("avatars").upload(`${userId}/avatar`, png, { contentType: "image/png" });
    expect(upload.error).toBeNull();

    const result = await deleteAccountWithAvatar(service, userId);
    expect(result.removedObjects).toBe(1);

    const folder = await service.storage.from("avatars").list(userId);
    expect(folder.data ?? []).toHaveLength(0);
    const lookup = await service.auth.admin.getUserById(userId);
    expect(lookup.data.user).toBeNull();
  } finally {
    await service.storage.from("avatars").remove([`${userId}/avatar`]);
    await service.auth.admin.deleteUser(userId);
  }
});
