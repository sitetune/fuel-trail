import { expect, test } from "@playwright/test";

test("marketing home and login are usable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "FuelTrail" })).toBeVisible();
  await page.getByRole("link", { name: "Sign in" }).click();
  await page.waitForURL("**/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(1);
});

test("driver capture journey", async ({ page }) => {
  test.skip(!process.env.E2E_DRIVER_EMAIL, "Set E2E_DRIVER_EMAIL and E2E_DRIVER_PASSWORD after seeding.");
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_DRIVER_EMAIL!);
  await page.getByLabel("Password").fill(process.env.E2E_DRIVER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Estimated fuel")).toBeVisible();
  await page.getByRole("link", { name: "Scan fuel receipt" }).click();
  await page.setInputFiles('input[type="file"]', "tests/fixtures/receipt.jpg");
  await page.getByRole("button", { name: "Use photo" }).click();
  await expect(page.getByRole("heading", { name: "Review receipt" })).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Merchant").fill("Pilot Baytown");
  await page.getByLabel("Address").fill("550 I-10");
  await page.getByLabel("City").fill("Baytown");
  await page.getByLabel("State").fill("TX");
  await page.getByLabel("Gallons").fill("80");
  await page.getByLabel("Total").fill("280");
  await page.getByRole("button", { name: "Submit receipt" }).click();
  await expect(page.getByText("Receipt submitted")).toBeVisible();
});

test("driver cannot open management", async ({ page }) => {
  test.skip(!process.env.E2E_DRIVER_EMAIL, "Requires seeded driver.");
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_DRIVER_EMAIL!);
  await page.getByLabel("Password").fill(process.env.E2E_DRIVER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.goto("/manage");
  await expect(page).not.toHaveURL(/\/manage$/);
});

test("manager verifies a receipt", async ({ page }) => {
  test.skip(!process.env.E2E_MANAGER_EMAIL, "Requires seeded manager.");
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_MANAGER_EMAIL!);
  await page.getByLabel("Password").fill(process.env.E2E_MANAGER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Fleet" })).toBeVisible();
  await page.goto("/manage/receipts?status=submitted");
  await expect(page.getByRole("heading", { name: "Receipts" })).toBeVisible();
});

test("IFTA report page shows limitation note", async ({ page }) => {
  test.skip(!process.env.E2E_MANAGER_EMAIL, "Requires seeded manager.");
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_MANAGER_EMAIL!);
  await page.getByLabel("Password").fill(process.env.E2E_MANAGER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.goto("/manage/reports");
  await expect(
    page.getByText("Fuel purchase worksheet only. A complete IFTA return also requires distance traveled in each jurisdiction."),
  ).toBeVisible();
});
