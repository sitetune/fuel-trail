import { expect, test } from "@playwright/test";

const email = process.env.E2E_DRIVER_EMAIL ?? "driver.a@gulfcoasthaul.example";
const password = process.env.E2E_DRIVER_PASSWORD ?? "FuelTrail-demo-1";

test.use({ viewport: { width: 390, height: 844 } });

test("driver fuel stop is prominent with directions", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/driver/, { timeout: 20_000 });

  await expect(page.getByText("Assigned fuel stop").first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Katy|Pederson|Interstate|I-\d+|US-\d+|Exit |Baytown|Humble|Conroe/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Get directions" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Google Maps" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Apple Maps" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Waze" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Get directions" })).toHaveAttribute("href", /google\.com\/maps/);
  await page.getByRole("link", { name: "Station details" }).click();
  await expect(page).toHaveURL(/\/driver\/fuel-stop\//);
  await expect(page.getByRole("link", { name: "Add receipt after fueling" })).toBeVisible();

  await page.goto("/driver/notifications");
  await expect(page.getByRole("heading", { name: "Alerts" })).toBeVisible();
});
