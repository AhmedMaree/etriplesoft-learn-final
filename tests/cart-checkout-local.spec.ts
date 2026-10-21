import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

// Run with playwright.cart-local.config.ts only: it creates a disposable Local Supabase learner.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
test.skip(
  url !== "http://127.0.0.1:54321" || !serviceKey,
  "Local Supabase only.",
);

const email = `cart-${randomUUID()}@example.test`;
const password = `Aa1-${randomUUID()}!`;
let userId = "";
let service: SupabaseClient<Database>;

function localSql(statement: string) {
  execFileSync(
    "docker",
    [
      "exec",
      "supabase_db_etriplesoft-learn-local",
      "psql",
      "-X",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      statement,
    ],
    { stdio: "ignore" },
  );
}

// Commerce tables are not granted to service_role, so assertions read them through psql.
function localQuery(statement: string) {
  return execFileSync(
    "docker",
    [
      "exec",
      "supabase_db_etriplesoft-learn-local",
      "psql",
      "-X",
      "-tA",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-c",
      statement,
    ],
    { encoding: "utf8" },
  ).trim();
}

test.beforeAll(async () => {
  service = createClient<Database>(url!, serviceKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user)
    throw new Error(`Could not create local cart learner: ${error?.message}`);
  userId = data.user.id;
  // A second paid course for the multi-course order; restored in afterAll.
  localSql(
    "UPDATE public.courses SET price_minor=19900 WHERE slug='python-fundamentals';",
  );
});

test.afterAll(async () => {
  localSql(
    "UPDATE public.courses SET price_minor=0 WHERE slug='python-fundamentals';",
  );
  if (!userId) return;
  localSql(
    `DELETE FROM public.payments WHERE order_id IN (SELECT id FROM public.orders WHERE user_id='${userId}');` +
      `DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE user_id='${userId}');` +
      `DELETE FROM public.orders WHERE user_id='${userId}'; DELETE FROM public.coupons WHERE created_by='${userId}';` +
      `DELETE FROM public.cart_items WHERE user_id='${userId}'; DELETE FROM public.cart_events WHERE user_id='${userId}';` +
      `DELETE FROM auth.users WHERE id='${userId}';`,
  );
});

test("signing in from the cart continues straight to billing with one multi-course order", async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(180_000);
  await context.addCookies([
    {
      name: "ets_cart",
      value: encodeURIComponent("odoo-development,python-fundamentals"),
      url: baseURL!,
    },
  ]);
  await page.goto("/en/cart");
  await expect(page.locator(".checkout-review-item")).toHaveCount(2);
  await page.getByTestId("cart-sign-in").click();

  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator("form.auth-fields button[type=submit]").click();
  await page.waitForURL(/\/en\/payment\?order=[0-9a-f-]{36}&step=checkout$/, {
    timeout: 60_000,
  });

  const orderId = new URL(page.url()).searchParams.get("order")!;
  expect(
    localQuery(
      `SELECT kind||'|'||subtotal_minor FROM public.orders WHERE id='${orderId}'`,
    ),
  ).toBe(`cart|${49900 + 19900}`);
  // Multi-course summary: each course is listed with its own price, in cart order.
  await expect(page.locator(".checkout-order-item h3")).toHaveText([
    "Odoo Development",
    /Python/,
  ]);
  await expect(page.locator(".checkout-order-item-price")).toHaveCount(2);
  await expect(page.getByText("Number of courses")).toBeVisible();

  // Editing the cart and checking out again rewrites the same unpaid order instead of adding one.
  await page.goto("/en/cart");
  await page.getByTestId("cart-remove").last().click();
  await expect(page.locator(".checkout-review-item")).toHaveCount(1);
  await page.getByTestId("cart-checkout").click();
  await page.waitForURL(new RegExp(`order=${orderId}&step=checkout$`));
  expect(
    localQuery(`SELECT count(*) FROM public.orders WHERE user_id='${userId}'`),
  ).toBe("1");
  expect(
    localQuery(
      `SELECT subtotal_minor FROM public.orders WHERE id='${orderId}'`,
    ),
  ).toBe("49900");
});

test("the cart follows the account to another device, takes a coupon, and sign-out clears this browser", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(180_000);
  localSql(
    `INSERT INTO public.coupons(code,percent_off,created_by) VALUES('CARTTEN',10,'${userId}');`,
  );
  // A fresh browser has no cart cookie; signing in brings back the account cart.
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await page.goto("/en/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator("form.auth-fields button[type=submit]").click();
  await page.waitForURL((current) => !current.pathname.endsWith("/login"));
  await page.goto("/en/cart");
  await expect(page.locator(".checkout-review-item")).toHaveCount(1);
  await expect(page.locator(".checkout-review-item h3")).toHaveText(
    "Odoo Development",
  );
  await expect(page.getByTestId("header-cart")).toHaveAttribute(
    "aria-label",
    "Cart, 1 course",
  );

  // Coupons can be applied in the cart; the discount carries into billing.
  await page.locator("#cart-coupon").fill("cartten");
  await page.locator(".checkout-coupon button[type=submit]").click();
  await expect(page.locator(".checkout-order-rows .is-discount")).toContainText(
    "CARTTEN",
  );
  await expect(page.locator(".checkout-order-total strong")).toHaveText(
    /449\.10/,
  );
  await page.getByTestId("cart-checkout").click();
  await page.waitForURL(/step=checkout$/);
  await expect(page.locator(".checkout-order-rows .is-discount")).toContainText(
    "CARTTEN",
  );

  // Signing out clears this browser's copy; the account keeps the cart.
  await page.locator(".user-menu").click();
  await page.getByRole("button", { name: /log ?out/i }).click();
  await page.waitForURL(/\/en\/login/);
  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "ets_cart")).toBeUndefined();
  expect(
    localQuery(
      `SELECT count(*) FROM public.cart_items WHERE user_id='${userId}'`,
    ),
  ).toBe("1");
  await context.close();
});
