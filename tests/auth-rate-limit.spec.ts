import { randomBytes } from "node:crypto";
import fs from "node:fs";
import { test, expect, type Locator, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isRateLimitError, RATE_LIMIT_COOLDOWN_SECONDS } from "../src/features/auth/rate-limit";
import { deleteAccountWithAvatar } from "../src/lib/supabase/account-deletion";

const messages = (locale: "en" | "ar") =>
  JSON.parse(fs.readFileSync(`messages/${locale}.json`, "utf8").replace(/^﻿/, "")).auth as {
    retryIn: string;
    errors: Record<string, string>;
  };

test("rate-limit detection accepts 429 and the documented codes only", () => {
  expect(isRateLimitError({ status: 429, code: "anything" })).toBe(true);
  expect(isRateLimitError({ code: "over_email_send_rate_limit" })).toBe(true);
  expect(isRateLimitError({ code: "over_request_rate_limit" })).toBe(true);
  expect(isRateLimitError({ status: 400, code: "email_address_invalid" })).toBe(false);
  expect(isRateLimitError({ status: 500 })).toBe(false);
  expect(isRateLimitError(null)).toBe(false);
  expect(isRateLimitError(undefined)).toBe(false);
  expect(isRateLimitError("429")).toBe(false);
  expect(RATE_LIMIT_COOLDOWN_SECONDS).toBeGreaterThanOrEqual(30);
});

test("rate-limit copy exists in both locales with a countdown placeholder", () => {
  for (const locale of ["en", "ar"] as const) {
    const auth = messages(locale);
    expect(auth.errors.rateLimited.length).toBeGreaterThan(10);
    expect(auth.retryIn).toContain("{seconds}");
  }
  expect(messages("ar").errors.rateLimited).toMatch(/[؀-ۿ]/);
  expect(messages("ar").retryIn).toMatch(/[؀-ۿ]/);
});

// ---- hosted DEV UI (needs the process-only key) -----------------------------------------
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const live = Boolean(url && publishableKey && serviceKey);

test.describe("hosted DEV rate-limit UI", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!live, "Needs the Supabase URL, publishable key and a process-only service-role key.");

  const runId = `${Date.now()}-${randomBytes(3).toString("hex")}`;
  const password = `Aa1-${randomBytes(12).toString("base64url")}`;
  const ids: string[] = [];
  const emails = { existing: `codex-rl-${runId}-existing@example.test`, unconfirmed: `codex-rl-${runId}-unconfirmed@example.test` };
  let service: SupabaseClient;

  test.beforeAll(async () => {
    service = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
    for (const [label, confirmed] of [["existing", true], ["unconfirmed", false]] as const) {
      const { data, error } = await service.auth.admin.createUser({ email: emails[label], password, email_confirm: confirmed });
      if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
      ids.push(data.user.id);
    }
  });

  test.afterAll(async () => {
    if (!service) return;
    const { data } = await service.auth.admin.listUsers({ perPage: 200 });
    for (const user of data?.users ?? []) if (user.email?.startsWith(`codex-rl-${runId}-`) && !ids.includes(user.id)) ids.push(user.id);
    for (const id of ids) await deleteAccountWithAvatar(service, id);
  });

  async function expectCooldown(page: Page, locale: "en" | "ar", submit: Locator) {
    const auth = messages(locale);
    // Either the hosted email quota is exhausted (what this asserts) or the request really sent
    // an email; in the latter case there is no 429 to assert on, so report a skip, not a pass.
    const outcome = page.locator(".auth-message.error, .auth-message.success").first();
    await expect(outcome).toBeVisible({ timeout: 20000 });
    const limited = (await outcome.textContent())?.trim() === auth.errors.rateLimited;
    test.skip(!limited, "Hosted email quota was not exhausted, so no 429 occurred (a real email was sent).");
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveText(locale === "en" ? /Try again in \d{1,2}s/ : /بعد \d{1,2} ثانية/);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
  }

  async function fillSignup(page: Page, email: string) {
    await page.goto("/en/sign-up");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="display_name"]').fill("Rate Limit Tester");
    await page.locator('input[name="university"]').fill("Test University");
    await page.locator('input[name="faculty"]').fill("Engineering");
    await page.locator('input[name="password"]').fill(password);
    await page.locator('input[name="confirm_password"]').fill(password);
  }

  test("signup for an existing address stays generic (no account-existence signal)", async ({ page }) => {
    await fillSignup(page, emails.existing);
    await page.locator("form.auth-fields button[type=submit]").click();
    await expect(page.locator(".auth-message.success")).toBeVisible({ timeout: 20000 });
  });

  test("forgot-password for an unknown address stays generic", async ({ page }) => {
    await page.goto("/en/forgot-password");
    await page.locator('input[name="email"]').fill(`codex-rl-${runId}-nobody@example.test`);
    await page.locator("form.auth-fields button[type=submit]").click();
    await expect(page.locator(".auth-message.success")).toBeVisible({ timeout: 20000 });
  });

  test("signup shows the rate-limit message and a button cooldown (EN)", async ({ page }) => {
    await fillSignup(page, `codex-rl-${runId}-new@example.test`);
    const submit = page.locator("form.auth-fields button[type=submit]");
    await submit.click();
    await expectCooldown(page, "en", submit);
  });

  test("forgot-password shows the rate-limit message and a button cooldown (AR)", async ({ page }) => {
    await page.goto("/ar/forgot-password");
    await page.locator('input[name="email"]').fill(emails.existing);
    const submit = page.locator("form.auth-fields button[type=submit]");
    await submit.click();
    await expectCooldown(page, "ar", submit);
  });

  test("resend confirmation shows the rate-limit message and a button cooldown (EN)", async ({ page }) => {
    await page.goto("/en/login");
    await page.locator('input[name="email"]').fill(emails.unconfirmed);
    await page.locator('input[name="password"]').fill(password);
    await page.locator("form.auth-fields button[type=submit]").click();
    const resend = page.locator("form.auth-resend button[type=submit]");
    await expect(resend).toBeVisible();
    await resend.click();
    // Resend answers with the generic notice unless the quota is exhausted.
    const outcome = page.locator(".auth-resend .auth-message.error, .auth-resend [role=status]").first();
    await expect(outcome).toBeVisible({ timeout: 20000 });
    test.skip((await outcome.textContent())?.trim() !== messages("en").errors.rateLimited, "Hosted email quota was not exhausted.");
    await expect(resend).toBeDisabled();
    await expect(resend).toHaveText(/Try again in \d{1,2}s/);
  });
});
