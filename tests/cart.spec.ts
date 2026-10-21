import { test, expect } from "@playwright/test";

test("guests can fill the cart and must sign in to check out", async ({
  page,
}) => {
  await page.goto("/en/courses");
  const headerCart = page.getByTestId("header-cart");
  await expect(headerCart).toHaveAttribute("aria-label", "Cart");

  await page.getByTestId("course-add-to-cart").first().click();
  await expect(page.locator(".toast")).toContainText("was added to your cart");
  await expect(page.locator(".toast-action")).toHaveAttribute(
    "href",
    "/en/cart",
  );
  await expect(headerCart).toHaveAttribute("aria-label", "Cart, 1 course");
  await expect(page.getByTestId("course-view-cart").first()).toBeVisible();

  await headerCart.click();
  await expect(page).toHaveURL(/\/en\/cart$/);
  await expect(page.locator(".checkout-review-item")).toHaveCount(1);
  await expect(page.getByTestId("cart-sign-in")).toHaveAttribute(
    "href",
    "/en/login?next=%2Fen%2Fcart%3Fcheckout%3D1",
  );

  await page.getByTestId("cart-remove").click();
  await expect(page.locator(".checkout-empty-state")).toBeVisible();
  await expect(headerCart).toHaveAttribute("aria-label", "Cart");
});

test("unknown courses are dropped from the stored cart", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "ets_cart",
      value: "not-a-real-course",
      url: "http://127.0.0.1:3010",
    },
  ]);
  await page.goto("/ar/cart");
  await expect(page.locator(".checkout-cart-dropped")).toBeVisible();
  await expect(page.locator(".checkout-empty-state")).toBeVisible();
  await expect
    .poll(
      async () =>
        (await context.cookies()).find((cookie) => cookie.name === "ets_cart")
          ?.value ?? "",
    )
    .toBe("");
});

test("the marketing course page keeps its buttons in place while the price loads", async ({
  page,
}) => {
  await page.goto("/en/catalog/odoo-development");
  const curriculum = page.locator(".mk-course-actions a[href='#curriculum']");
  const before = await curriculum.boundingBox();
  await expect(
    page.locator(".mk-course-actions [data-testid=course-add-to-cart]"),
  ).toBeVisible();
  expect(await curriculum.boundingBox()).toEqual(before);
});

test("the public site header shows the cart", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByTestId("header-cart").first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".mk-cart--mobile")).toBeVisible();
});
