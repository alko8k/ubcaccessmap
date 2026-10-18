import { expect, test } from "@playwright/test";

test("map page loads campus chrome and results", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "UBC Access Map" })).toBeVisible();
  await expect(page.getByLabel("Search campus")).toBeVisible();
  await expect(page.getByText(/\d+ (matching )?washrooms?/i)).toBeVisible();
});
