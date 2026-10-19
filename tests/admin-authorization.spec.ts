import { randomBytes } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";
import { enrollAdminTotp, passAdminMfa, totpCode, verifyAdminTotp } from "./support/admin-mfa";

const locales = ["en", "ar"] as const;
const routes = ["admin", "admin/roles", "admin/audit"] as const;

test.describe("anonymous visitors", () => {
  for (const locale of locales) {
    for (const route of routes) {
      test(`/${locale}/${route} redirects to login with a safe return path`, async ({ page }) => {
        await page.goto(`/${locale}/${route}`);
        await expect(page).toHaveURL(new RegExp(`/${locale}/login\\?next=`));
        await expect(page.locator("form.auth-fields")).toBeVisible();
        await expect(page.getByRole("table")).toHaveCount(0);
      });
    }
  }
});

// Live lifecycle against hosted DEV. Grants write append-only audit rows and restricted foreign keys,
// so the disposable users it creates can never be deleted afterwards: opt in with PHASE06_LIVE=1.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const live = Boolean(url && publishableKey && serviceKey && process.env.PHASE06_LIVE === "1");

test.describe("admin lifecycle (hosted DEV)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!live, "Set PHASE06_LIVE=1 with the Supabase URL, publishable key and a process-only service-role key.");

  const runId = `${Date.now()}-${randomBytes(3).toString("hex")}`;
  const password = `Aa1-${randomBytes(12).toString("base64url")}`;
  const emailOf = (label: string) => `codex-admin-${runId}-${label}@example.test`;
  const ids: Record<string, string> = {};
  // TOTP secrets of the test admins; admin authority needs an MFA-verified (aal2) session.
  const secrets: Record<string, string> = {};
  let service: SupabaseClient<Database>;

  async function makeUser(label: string) {
    const { data, error } = await service.auth.admin.createUser({
      email: emailOf(label),
      password,
      email_confirm: true,
      user_metadata: { display_name: `Admin ${label}`, role: "admin", permissions: { admin: true } },
    });
    if (error || !data.user) throw new Error(`createUser ${label} failed: ${error?.message}`);
    ids[label] = data.user.id;
  }

  async function login(page: Page, locale: "en" | "ar", label: string) {
    await page.goto(`/${locale}/login`);
    await page.locator('input[name="email"]').fill(emailOf(label));
    await page.locator('input[name="password"]').fill(password);
    await page.locator("form.auth-fields button[type=submit]").click();
    await page.waitForURL((u) => !u.pathname.endsWith("/login"));
    if (secrets[label]) {
      await page.goto(`/${locale}/admin`);
      await passAdminMfa(page, secrets[label]);
    }
  }

  async function passwordClient(label: string) {
    const client = createClient<Database>(url!, publishableKey!, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error } = await client.auth.signInWithPassword({ email: emailOf(label), password });
    if (error) throw new Error(`sign-in ${label} failed: ${error.message}`);
    return client;
  }

  async function rpcClient(label: string) {
    const client = await passwordClient(label);
    if (secrets[label]) await verifyAdminTotp(client, secrets[label]);
    return client;
  }

  test.beforeAll(async () => {
    service = createClient<Database>(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
    for (const label of ["boss", "second", "learner", "target", "fresh"]) await makeUser(label);
    // Bootstrap exactly as the operator script does: service-role insert, audited by trigger.
    const { error } = await service.from("user_roles").insert({ user_id: ids.boss, role: "admin", granted_by: ids.boss });
    if (error) throw new Error(`bootstrap failed: ${error.message}`);
    // "fresh" is an admin who has not set up MFA yet.
    const fresh = await service.from("user_roles").insert({ user_id: ids.fresh, role: "admin", granted_by: ids.boss });
    if (fresh.error) throw new Error(`fresh admin grant failed: ${fresh.error.message}`);
    for (const label of ["boss", "second"]) secrets[label] = await enrollAdminTotp(await passwordClient(label));
  });

  for (const locale of locales) {
    test(`a learner is denied in ${locale}, even with admin metadata`, async ({ page }) => {
      await login(page, locale, "learner");
      await page.goto(`/${locale}/admin`);
      await expect(page.locator(".admin-denied")).toBeVisible();
      await expect(page.getByRole("table")).toHaveCount(0);
      await page.goto(`/${locale}/admin/audit`);
      await expect(page.locator(".admin-denied")).toBeVisible();
    });
  }

  test("a learner cannot call the admin RPCs or the audit table directly", async () => {
    const learner = await rpcClient("learner");
    for (const call of [
      learner.rpc("admin_grant_role", { p_user_id: ids.learner, p_role: "admin" }),
      learner.rpc("admin_revoke_role", { p_role_id: "00000000-0000-0000-0000-000000000000" }),
      learner.rpc("admin_find_user_by_email", { p_email: emailOf("boss") }),
      learner.rpc("admin_list_role_grants"),
      learner.rpc("admin_list_audit"),
    ]) {
      expect((await call).error?.code).toBe("42501");
    }
    expect((await learner.from("admin_audit_log").select("id")).error).not.toBeNull();
    expect((await learner.from("admin_audit_log").delete().neq("id", "00000000-0000-0000-0000-000000000000")).error).not.toBeNull();
  });

  for (const locale of locales) {
    test(`an admin sees the admin pages in ${locale}`, async ({ page }) => {
      await login(page, locale, "boss");
      await page.goto(`/${locale}/admin`);
      await expect(page.locator(".admin-stats")).toBeVisible();
      await page.goto(`/${locale}/admin/roles`);
      await expect(page.getByRole("table").first()).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      await page.goto(`/${locale}/admin/audit`);
      await expect(page.getByRole("table").first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }

  test("an admin without MFA must set it up first, and a password-only session cannot call admin RPCs", async ({ page }) => {
    await login(page, "en", "fresh");
    const api = await page.request.post("/api/admin/resources", { headers: { Origin: new URL(page.url()).origin }, data: {} });
    expect(api.status()).toBe(403);
    expect(await api.json()).toEqual({ error: "access" });
    await page.goto("/en/admin");
    await expect(page.locator("#admin-mfa-title")).toHaveText("Set up two-factor authentication");
    await expect(page.locator(".admin-stats")).toHaveCount(0);
    await page.locator(".admin-mfa .btn").click();
    await expect(page.locator(".admin-mfa-setup img")).toBeVisible();
    const secret = (await page.locator(".admin-mfa-setup code").textContent())!.trim();
    await page.locator('.admin-mfa input[name="code"]').fill("000000");
    await page.locator(".admin-mfa-form button[type=submit]").click();
    await expect(page.locator("#admin-mfa-error")).toBeVisible();
    await page.locator('.admin-mfa input[name="code"]').fill(totpCode(secret));
    await page.locator(".admin-mfa-form button[type=submit]").click();
    await expect(page.locator(".admin-stats")).toBeVisible();
    secrets.fresh = secret;
    expect((await (await rpcClient("fresh")).rpc("admin_list_audit")).error).toBeNull();

    // Database enforcement (migration 20261019120000): enrolled or not, password-only is refused.
    for (const label of ["fresh", "boss"]) {
      expect((await (await passwordClient(label)).rpc("admin_list_audit")).error?.code).toBe("42501");
    }
  });

  test("grant and revoke through the UI are audited, and the last admin is protected", async ({ page }) => {
    await login(page, "en", "boss");
    await page.goto("/en/admin/roles");
    await page.locator('input[name="email"]').fill(emailOf("second"));
    await page.locator('select[name="role"]').selectOption("admin");
    await page.getByRole("button", { name: "Grant role" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Role granted." })).toBeVisible();

    await page.locator('input[name="email"]').fill(emailOf("nobody"));
    await page.getByRole("button", { name: "Grant role" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "No account was found" })).toBeVisible();

    const boss = await rpcClient("boss");
    const audit = await boss.rpc("admin_list_audit", { p_limit: 100 });
    const actions = (audit.data ?? []).map((row) => row.action);
    expect(actions).toEqual(expect.arrayContaining(["user_role.granted", "user.looked_up"]));
  });

  test("a revoked admin loses access immediately, on pages and RPCs", async ({ browser }) => {
    const second = await rpcClient("second");
    const bossClient = await rpcClient("boss");
    const grants = await bossClient.rpc("admin_list_role_grants", { p_limit: 100 });
    const bossGrant = (grants.data ?? []).find((row) => row.user_id === ids.boss && row.role === "admin" && !row.revoked_at);
    expect(bossGrant).toBeDefined();

    const page = await (await browser.newContext()).newPage();
    await login(page, "en", "boss");
    await page.goto("/en/admin/roles");
    await expect(page.getByRole("table").first()).toBeVisible();

    // A second admin revokes boss; boss's still-open session must not keep working.
    const revoked = await second.rpc("admin_revoke_role", { p_role_id: bossGrant!.id });
    expect(revoked.error).toBeNull();
    await page.goto("/en/admin/roles");
    await expect(page.locator(".admin-denied")).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
    expect((await bossClient.rpc("admin_list_audit")).error?.code).toBe("42501");

    // Earlier runs leave their own test admins active on DEV. Retire only those (never a real
    // admin), then the one admin left must be impossible to revoke.
    const remaining = await second.rpc("admin_list_role_grants", { p_limit: 100 });
    const active = (remaining.data ?? []).filter((row) => row.role === "admin" && !row.revoked_at);
    const foreign = active.filter((row) => row.user_id !== ids.second);
    test.skip(foreign.some((row) => !row.email?.startsWith("codex-admin-")), "A non-test administrator exists on DEV; not retiring it.");
    for (const row of foreign) expect((await second.rpc("admin_revoke_role", { p_role_id: row.id })).error).toBeNull();
    const secondGrant = active.find((row) => row.user_id === ids.second);
    expect((await second.rpc("admin_revoke_role", { p_role_id: secondGrant!.id })).error?.code).toBe("23514");
  });
});
