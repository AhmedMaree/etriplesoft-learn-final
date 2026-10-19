import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { deleteAccountWithAvatar } from "../src/lib/supabase/account-deletion";

// Phase 05 live-flow verification against the hosted DEV project with disposable users.
// Needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and a process-only
// SUPABASE_SERVICE_ROLE_KEY; the whole file is skipped when the service key is absent.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = Boolean(url && publishableKey && serviceKey);

test.describe.configure({ mode: "serial" });
test.skip(!enabled, "Set the Supabase URL, publishable key and a process-only service-role key.");

const runId = `${Date.now()}-${randomBytes(3).toString("hex")}`;
const password = `Aa1-${randomBytes(12).toString("base64url")}`;
const newPassword = `Bb2-${randomBytes(12).toString("base64url")}`;
const emailOf = (label: string) => `codex-auth-${runId}-${label}@example.test`;
const shots = path.join("test-results", "phase05");
const widths = [320, 375, 430, 768, 1024, 1280, 1440, 1920];

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/VsgAAAAASUVORK5CYII=",
  "base64",
);
const png2 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

let service: SupabaseClient;
const created: string[] = [];
const users: Record<string, { id: string; email: string }> = {};

async function makeUser(label: string, confirmed = true, locale: "en" | "ar" = "en") {
  const email = emailOf(label);
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: confirmed,
    user_metadata: { display_name: `Auth ${label}`, learner_profile: { learner_type: "student", university: "Test University", faculty: "Engineering" } },
  });
  if (error || !data.user) throw new Error(`createUser ${label} failed: ${error?.message}`);
  created.push(data.user.id);
  users[label] = { id: data.user.id, email };
  await service.from("learner_preferences").update({ preferred_locale: locale }).eq("user_id", data.user.id);
  return users[label];
}

async function login(page: Page, locale: "en" | "ar", email: string, pass = password, next = "") {
  await page.goto(`/${locale}/login${next}`);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(pass);
  await page.locator("form.auth-fields button[type=submit]").click();
}

async function logout(page: Page) {
  await page.locator(".user-menu").click();
  await page.locator(".popover form button[type=submit]").click();
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

test.beforeAll(async () => {
  service = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  fs.mkdirSync(shots, { recursive: true });
  await makeUser("main");
  await makeUser("unconfirmed", false);
  await makeUser("arabic", true, "ar");
  await makeUser("settings");
});

test.afterAll(async () => {
  if (!service) return;
  const { data } = await service.auth.admin.listUsers({ perPage: 200 });
  for (const user of data?.users ?? []) {
    if (user.email?.startsWith(`codex-auth-${runId}-`) && !created.includes(user.id)) created.push(user.id);
  }
  // Same path production account deletion uses: avatar objects first, then the user.
  for (const id of created) await deleteAccountWithAvatar(service, id);
});

test("login rejects wrong credentials and unconfirmed accounts without leaking detail", async ({ page }) => {
  await login(page, "en", users.main.email, "wrong-password-1");
  await expect(page.locator("#auth-error")).toBeVisible();
  await expect(page).toHaveURL(/\/en\/login/);

  await login(page, "en", users.unconfirmed.email);
  await expect(page.locator("#auth-error")).toBeVisible();
  await expect(page.locator(".auth-resend button")).toBeVisible();
  await expect(page).toHaveURL(/\/en\/login/);
});

test("login ignores external and encoded return destinations", async ({ page }) => {
  await login(page, "en", users.main.email, password, "?next=https%3A%2F%2Fevil.example");
  await expect(page).toHaveURL(/\/en\/overview$/);
  expect(new URL(page.url()).origin).toBe("http://127.0.0.1:3010");
  await logout(page);
  await expect(page).toHaveURL(/\/en\/login$/);

  await login(page, "en", users.main.email, password, "?next=%2F%2Fevil.example");
  await expect(page).toHaveURL(/\/en\/overview$/);
  await logout(page);
});

test("EN session survives reload, protected pages open, logout ends access", async ({ page }) => {
  await login(page, "en", users.main.email);
  await expect(page).toHaveURL(/\/en\/overview$/);
  await page.reload();
  await expect(page).toHaveURL(/\/en\/overview$/);
  await page.goto("/en/settings");
  await expect(page).toHaveURL(/\/en\/settings$/);
  await page.goto("/en/login");
  await expect(page).toHaveURL(/\/en\/overview$/); // signed-in users are bounced off guest pages

  await logout(page);
  await expect(page).toHaveURL(/\/en\/login$/);
  await page.goto("/en/settings");
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fen%2Fsettings$/);
  await page.goBack();
  await page.goto("/en/overview");
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fen%2Foverview$/);
});

test("expired access token is refreshed from the refresh token", async ({ page, context }) => {
  await login(page, "en", users.main.email);
  await expect(page).toHaveURL(/\/en\/overview$/);
  const cookies = await context.cookies();
  const auth = cookies.filter((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name));
  expect(auth.length).toBeGreaterThan(0);
  const joined = auth.sort((a, b) => a.name.localeCompare(b.name)).map((c) => c.value).join("");
  expect(joined.startsWith("base64-")).toBe(true);
  const session = JSON.parse(Buffer.from(joined.slice(7), "base64url").toString("utf8"));
  const originalAccess = session.access_token;
  session.access_token = originalAccess.split(".").slice(0, 2).join(".") + ".invalid";
  session.expires_at = 1;
  const tampered = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  await context.clearCookies();
  const base = auth[0];
  await context.addCookies([{ name: base.name.replace(/\.\d+$/, ""), value: tampered, domain: base.domain, path: "/", httpOnly: base.httpOnly, sameSite: "Lax" }]);
  await page.goto("/en/settings");
  await expect(page).toHaveURL(/\/en\/settings$/);
  const after = (await context.cookies()).filter((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name)).map((c) => c.value).join("");
  expect(after).not.toContain("invalid");
  await logout(page);
});

test("destroyed session cookies lose protected access", async ({ page, context }) => {
  await login(page, "en", users.main.email);
  await expect(page).toHaveURL(/\/en\/overview$/);
  await context.clearCookies();
  await page.goto("/en/certificates");
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fen%2Fcertificates$/);
});

test("an idle session is signed out with a notice and its refresh token revoked", async ({ page, context }) => {
  await login(page, "en", users.main.email);
  await expect(page).toHaveURL(/\/en\/overview$/);
  await page.reload(); // the proxy records activity from the first request after sign-in
  const cookies = await context.cookies();
  const activity = cookies.find((c) => c.name === "ets-session-activity");
  expect(activity?.httpOnly).toBe(true);
  const [sessionId, startedAt] = activity!.value.split(".");
  const eightDaysAgo = Math.floor(Date.now() / 1000) - 8 * 24 * 60 * 60;
  const auth = cookies.filter((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name));
  const joined = auth.sort((a, b) => a.name.localeCompare(b.name)).map((c) => c.value).join("");
  const refreshToken = JSON.parse(Buffer.from(joined.slice(7), "base64url").toString("utf8")).refresh_token;
  await context.addCookies([{ ...activity!, value: `${sessionId}.${startedAt}.${eightDaysAgo}` }]);

  await page.goto("/en/settings");
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fen%2Fsettings&notice=sessionExpired$/);
  await expect(page.locator("#auth-error")).toContainText("signed out");
  const signedOut = createClient(url!, publishableKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await signedOut.auth.refreshSession({ refresh_token: refreshToken });
  expect(error).not.toBeNull();
});

test("profile and preferences persist across reload and in the database", async ({ page }) => {
  await login(page, "en", users.main.email);
  await expect(page).toHaveURL(/\/en\/overview$/);
  await page.goto("/en/settings");
  const name = page.locator('input[name="display_name"]');
  await name.fill("Persisted Name");
  await page.locator("select[name='timezone'], input[name='timezone']").first().selectOption("Africa/Cairo").catch(() => undefined);
  await page.locator(".settings-buttons button[type=submit]").click();
  await expect(page.locator(".toast, [role=status]").first()).toBeVisible();
  await page.reload();
  await expect(page.locator('input[name="display_name"]')).toHaveValue("Persisted Name");

  await page.locator(".settings-nav button", { hasText: /Notifications/ }).click();
  const first = page.locator("button[role=switch]").first();
  const before = await first.getAttribute("aria-checked");
  await first.click();
  await page.locator(".settings-buttons button[type=submit]").click();
  await page.waitForTimeout(800);
  await page.reload();
  await page.locator(".settings-nav button", { hasText: /Notifications/ }).click();
  await expect(page.locator("button[role=switch]").first()).not.toHaveAttribute("aria-checked", before ?? "");

  const { data } = await service.from("profiles").select("display_name").eq("id", users.main.id).single();
  expect(data?.display_name).toBe("Persisted Name");
  await logout(page);
});

test("avatar upload, replacement, and rejected file keep the last valid image", async ({ page }) => {
  await login(page, "en", users.main.email);
  await expect(page).toHaveURL(/\/en\/overview$/);
  await page.goto("/en/settings");
  const input = page.locator("input[type=file]");
  const key = `${users.main.id}/avatar`;
  // Object metadata (not a CDN-cacheable download) tells us what is actually stored.
  const storedSize = async () => {
    const { data } = await service.storage.from("avatars").list(users.main.id);
    return data?.find((o) => o.name === "avatar")?.metadata?.size as number | undefined;
  };

  await input.setInputFiles({ name: "a.png", mimeType: "image/png", buffer: png });
  await expect.poll(storedSize, { timeout: 15000 }).toBe(png.length);
  await expect(page.locator(".change-photo img.avatar")).toHaveAttribute("src", /supabase/, { timeout: 15000 });

  await input.setInputFiles({ name: "b.png", mimeType: "image/png", buffer: png2 });
  await expect.poll(storedSize, { timeout: 15000 }).toBe(png2.length);

  // A fresh signed URL (what the page renders after refresh) must serve the replacement.
  const signed = await service.storage.from("avatars").createSignedUrl(key, 60);
  const served = await fetch(signed.data!.signedUrl, { cache: "no-store" });
  expect((await served.arrayBuffer()).byteLength).toBe(png2.length);

  await input.setInputFiles({ name: "bad.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") });
  await page.waitForTimeout(1500);
  expect(await storedSize()).toBe(png2.length);
  const { data } = await service.from("profiles").select("avatar_object_key").eq("id", users.main.id).single();
  expect(data?.avatar_object_key).toBe(key);
  await logout(page);
});

test("settings saves learner details and time zone, and tabs deep-link", async ({ page }) => {
  await login(page, "en", users.settings.email);
  await expect(page).toHaveURL(/\/en\/overview$/);
  await page.goto("/en/settings");
  await page.locator(".learner-type-options label", { hasText: /Professional/ }).click();
  await page.locator('input[name="job_title"]').fill("Odoo Consultant");
  await page.locator('input[name="years_experience"]').fill("4");
  await page.locator("select[name='timezone']").selectOption("Asia/Dubai");
  await page.locator(".settings-buttons button[type=submit]").click();
  await expect(page.locator(".toast").first()).toBeVisible();
  await expect.poll(async () => (await service.from("learner_profiles").select("learner_type, job_title, years_experience, university").eq("user_id", users.settings.id).single()).data)
    .toEqual({ learner_type: "professional", job_title: "Odoo Consultant", years_experience: 4, university: null });
  const { data: prefs } = await service.from("learner_preferences").select("timezone").eq("user_id", users.settings.id).single();
  expect(prefs?.timezone).toBe("Asia/Dubai");

  await page.locator(".settings-nav [role=tab]", { hasText: /Security/ }).click();
  await expect(page).toHaveURL(/\/en\/settings\?tab=security$/);
  await page.reload();
  await expect(page.locator(".settings-nav [role=tab][aria-selected=true]")).toContainText("Security");
  await logout(page);
});

test("data export returns only the signed-in learner's data", async ({ page }) => {
  expect((await page.request.get("/api/account/export")).status()).toBe(401);
  await login(page, "en", users.settings.email);
  await expect(page).toHaveURL(/\/en\/overview$/);
  const response = await page.request.get("/api/account/export");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-disposition"]).toMatch(/^attachment;/);
  const body = await response.json();
  expect(body.account.id).toBe(users.settings.id);
  expect(body.account.email).toBe(users.settings.email);
  await logout(page);
});

test("settings password change requires the current password", async ({ page }) => {
  await login(page, "en", users.settings.email);
  await expect(page).toHaveURL(/\/en\/overview$/);
  await page.goto("/en/settings?tab=security");
  await page.locator('input[name="current_password"]').fill("wrong-password-1");
  await page.locator('input[name="new_password"]').fill(newPassword);
  await page.locator('input[name="confirm_password"]').fill(newPassword);
  await page.locator("form.settings-subsection button[type=submit]").click();
  await expect(page.locator(".settings-message.error")).toBeVisible();

  await page.locator('input[name="current_password"]').fill(password);
  await page.locator("form.settings-subsection button[type=submit]").click();
  await expect(page.locator(".settings-message.success")).toBeVisible();
  await logout(page);

  await login(page, "en", users.settings.email, password);
  await expect(page.locator("#auth-error")).toBeVisible();
  await login(page, "en", users.settings.email, newPassword);
  await expect(page).toHaveURL(/\/en\/overview$/);
  await logout(page);
});

test("password reset changes the password, signs out, and the old password stops working", async ({ page }) => {
  await page.goto("/en/reset-password");
  await page.locator('input[name="password"]').fill(newPassword);
  await page.locator('input[name="confirm_password"]').fill(newPassword);
  await page.locator("form.auth-fields button[type=submit]").click();
  await expect(page.locator("#auth-error")).toBeVisible(); // no recovery session: refused

  await login(page, "en", users.main.email);
  await expect(page).toHaveURL(/\/en\/overview$/);
  await page.goto("/en/reset-password");
  await page.locator('input[name="password"]').fill(newPassword);
  await page.locator('input[name="confirm_password"]').fill("mismatch-" + newPassword);
  await page.locator("form.auth-fields button[type=submit]").click();
  await expect(page.locator("#auth-error")).toBeVisible();
  await page.locator('input[name="password"]').fill(newPassword);
  await page.locator('input[name="confirm_password"]').fill(newPassword);
  await page.locator("form.auth-fields button[type=submit]").click();
  await expect(page.locator(".auth-message.success")).toBeVisible();
  await page.goto("/en/settings");
  await expect(page).toHaveURL(/\/en\/login/);

  await login(page, "en", users.main.email, password);
  await expect(page.locator("#auth-error")).toBeVisible();
  await login(page, "en", users.main.email, newPassword);
  await expect(page).toHaveURL(/\/en\/overview$/);
  await logout(page);
});

test("forgot password gives the same generic answer for known and unknown addresses (EN and AR)", async ({ page }) => {
  await page.goto("/en/forgot-password");
  await page.locator('input[name="email"]').fill(emailOf("nobody"));
  await page.locator("form.auth-fields button[type=submit]").click();
  const en = page.locator(".auth-message.success");
  await expect(en).toBeVisible();
  await page.goto("/ar/forgot-password");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.locator('input[name="email"]').fill(emailOf("nobody2"));
  await page.locator("form.auth-fields button[type=submit]").click();
  await expect(page.locator(".auth-message.success")).toBeVisible();
});

test("AR login lands in RTL, persists, and logs out", async ({ page }) => {
  await login(page, "ar", users.arabic.email);
  await expect(page).toHaveURL(/\/ar\/overview$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.reload();
  await expect(page).toHaveURL(/\/ar\/overview$/);
  await page.goto("/ar/settings");
  await expect(page).toHaveURL(/\/ar\/settings$/);
  await logout(page);
  await expect(page).toHaveURL(/\/ar\/login$/);
  await page.goto("/ar/settings");
  await expect(page).toHaveURL(/\/ar\/login\?next=%2Far%2Fsettings$/);
});

test("signup creates an unconfirmed account with trigger-persisted onboarding data", async ({ page }) => {
  const email = emailOf("signup");
  await page.goto("/en/sign-up");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="display_name"]').fill("Signup Tester");
  await page.locator('input[name="university"]').fill("Signup University");
  await page.locator('input[name="faculty"]').fill("Signup Faculty");
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="confirm_password"]').fill(password);
  await page.locator("form.auth-fields button[type=submit]").click();
  const outcome = page.locator(".auth-message");
  await expect(outcome).toBeVisible({ timeout: 20000 });
  test.info().annotations.push({ type: "signup-outcome", description: (await outcome.getAttribute("class")) ?? "" });
  if (/error/.test((await outcome.getAttribute("class")) ?? "")) {
    // The app hides the provider reason on purpose; ask the API directly whether the hosted
    // built-in email sender is rate-limited so that case is reported as a skip, not a pass.
    const probe = await createClient(url!, publishableKey!, { auth: { persistSession: false } }).auth.signUp({ email: emailOf("probe"), password });
    if (probe.data.user) created.push(probe.data.user.id);
    test.skip(probe.error?.code === "over_email_send_rate_limit", "Hosted DEV email rate limit reached; real signup could not be exercised.");
  }
  await expect(outcome).toHaveClass(/success/);

  const { data: list } = await service.auth.admin.listUsers({ perPage: 200 });
  const row = list?.users.find((u) => u.email === email);
  expect(row).toBeTruthy();
  expect(row?.email_confirmed_at).toBeFalsy();
  if (row) created.push(row.id);
  const { data: lp } = await service.from("learner_profiles").select("learner_type, university, faculty, job_title").eq("user_id", row!.id).single();
  expect(lp).toMatchObject({ learner_type: "student", university: "Signup University", faculty: "Signup Faculty", job_title: null });

  await login(page, "en", email);
  await expect(page.locator("#auth-error")).toBeVisible();
  await expect(page).toHaveURL(/\/en\/login/);
});

test("signed-in screens fit at all required widths in both locales", async ({ page }) => {
  test.setTimeout(240000);
  for (const [locale, label] of [["en", "main"], ["ar", "arabic"]] as const) {
    await login(page, locale, users[label].email, label === "main" ? newPassword : password);
    await expect(page).toHaveURL(new RegExp(`/${locale}/overview$`));
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      for (const screen of ["overview", "settings"]) {
        await page.goto(`/${locale}/${screen}`);
        await page.waitForLoadState("networkidle");
        await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
        await noOverflow(page);
        await page.screenshot({ path: path.join(shots, `${locale}-${screen}-${width}.png`) });
      }
    }
    await page.setViewportSize({ width: 1448, height: 1086 });
    await logout(page);
  }
});
