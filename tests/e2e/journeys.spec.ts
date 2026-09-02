import { expect, test } from "@playwright/test";

async function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(1);
}

test("1. organization owner signup", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create your company" })).toBeVisible();
  await expect(page.getByText("Choose a plan")).toBeVisible();
  await expect(page.getByLabel("Company name")).toBeVisible();
  await expect(page.getByLabel("Work email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create company" })).toBeVisible();
  await assertNoHorizontalOverflow(page);
});

test("2. driver invitation and activation", async ({ page }) => {
  test.skip(!process.env.E2E_MANAGER_EMAIL, "Requires seeded manager to open Users.");
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_MANAGER_EMAIL!);
  await page.getByLabel("Password").fill(process.env.E2E_MANAGER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.goto("/manage/users");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await expect(page.getByText(/invite/i).first()).toBeVisible();
});

test("3. manager invitation and permissions", async ({ page }) => {
  test.skip(!process.env.E2E_MANAGER_EMAIL, "Requires seeded manager.");
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_MANAGER_EMAIL!);
  await page.getByLabel("Password").fill(process.env.E2E_MANAGER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Fleet" })).toBeVisible();
  await page.goto("/manage/receipts");
  await expect(page.getByRole("heading", { name: "Receipts" })).toBeVisible();
});

test("4. fleet CSV import", async ({ page }) => {
  test.skip(!process.env.E2E_MANAGER_EMAIL, "Requires seeded manager.");
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_MANAGER_EMAIL!);
  await page.getByLabel("Password").fill(process.env.E2E_MANAGER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.goto("/manage/import");
  await expect(page.getByRole("heading", { name: "Import Center" })).toBeVisible();
  await expect(page.getByRole("link", { name: /trucks/i }).first()).toBeVisible();
});

test("5. driver camera/gallery receipt upload", async ({ page }) => {
  test.skip(!process.env.E2E_DRIVER_EMAIL, "Set E2E_DRIVER_EMAIL after seeding.");
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_DRIVER_EMAIL!);
  await page.getByLabel("Password").fill(process.env.E2E_DRIVER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Estimated fuel")).toBeVisible();
  await page.getByRole("link", { name: "Scan fuel receipt" }).click();
  await page.setInputFiles('input[type="file"]', "tests/fixtures/receipt.jpg");
  await page.getByRole("button", { name: "Use photo" }).click();
  await expect(page.getByRole("heading", { name: /Review receipt|Correct and resubmit/ })).toBeVisible({
    timeout: 30_000,
  });
});

test("6. OCR review and submission", async ({ page }) => {
  test.skip(!process.env.E2E_DRIVER_EMAIL, "Requires seeded driver.");
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_DRIVER_EMAIL!);
  await page.getByLabel("Password").fill(process.env.E2E_DRIVER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("link", { name: "Scan fuel receipt" }).click();
  await page.setInputFiles('input[type="file"]', "tests/fixtures/receipt.jpg");
  await page.getByRole("button", { name: "Use photo" }).click();
  await expect(page.getByRole("heading", { name: /Review receipt|Correct and resubmit/ })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByLabel("Merchant").fill("Pilot Baytown");
  await page.getByLabel("Address").fill("550 I-10");
  await page.getByLabel("City").fill("Baytown");
  await page.getByLabel("State").fill("TX");
  await page.getByLabel("Gallons").fill("80");
  await page.getByLabel("Total").fill("280");
  await page.getByRole("button", { name: /Submit receipt|Resubmit receipt/ }).click();
  await expect(page.getByText("Receipt submitted")).toBeVisible();
});

test("7. offline queue and retry", async ({ page }) => {
  test.skip(!process.env.E2E_DRIVER_EMAIL, "Requires seeded driver.");
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_DRIVER_EMAIL!);
  await page.getByLabel("Password").fill(process.env.E2E_DRIVER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.goto("/driver/queue");
  await expect(page.getByRole("heading", { name: /Waiting|queue/i })).toBeVisible();
});

test("8. manager correction and verification", async ({ page }) => {
  test.skip(!process.env.E2E_MANAGER_EMAIL, "Requires seeded manager.");
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_MANAGER_EMAIL!);
  await page.getByLabel("Password").fill(process.env.E2E_MANAGER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.goto("/manage/receipts?status=submitted");
  await expect(page.getByRole("heading", { name: "Receipts" })).toBeVisible();
});

test("9. rejection, driver notification, and resubmission", async ({ page }) => {
  test.skip(!process.env.E2E_DRIVER_EMAIL, "Requires seeded driver.");
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_DRIVER_EMAIL!);
  await page.getByLabel("Password").fill(process.env.E2E_DRIVER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.goto("/driver/notifications");
  await expect(page.getByRole("heading", { name: "Alerts" })).toBeVisible();
  await page.goto("/driver/receipts");
  await expect(page.getByRole("heading", { name: /Receipts/i })).toBeVisible();
});

test("10. receipt printing and filtered reporting", async ({ page }) => {
  test.skip(!process.env.E2E_MANAGER_EMAIL, "Requires seeded manager.");
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_MANAGER_EMAIL!);
  await page.getByLabel("Password").fill(process.env.E2E_MANAGER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.goto("/manage/reports");
  await expect(
    page.getByText("Fuel purchase worksheet only. A complete IFTA return also requires distance traveled in each jurisdiction."),
  ).toBeVisible();
  await page.goto("/manage/receipts");
  await expect(page.getByRole("heading", { name: "Receipts" })).toBeVisible();
});

test("11. cross-organization data isolation", async ({ page }) => {
  test.skip(!process.env.E2E_DRIVER_EMAIL, "Requires seeded driver.");
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_DRIVER_EMAIL!);
  await page.getByLabel("Password").fill(process.env.E2E_DRIVER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.goto("/manage");
  await expect(page).not.toHaveURL(/\/manage$/);
});
