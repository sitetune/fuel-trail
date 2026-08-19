import { expect, test } from "@playwright/test";

test("marketing home, signup, and login are usable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "FuelTrail" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create a company" })).toBeVisible();
  await page.getByRole("link", { name: "Sign in" }).click();
  await page.waitForURL("**/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("link", { name: "Create a company account" })).toBeVisible();
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(1);
});

test("company signup form is reachable", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create your company" })).toBeVisible();
  await expect(page.getByLabel("Company name")).toBeVisible();
  await expect(page.getByLabel("Work email")).toBeVisible();
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(1);
});
