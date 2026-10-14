import { expect, test } from "./fixtures";

test("redirects signed-out visitors to the login page", async ({ page }) => {
  for (const path of [
    "/",
    "/reviews",
    "/reviews/7",
    "/resources",
    "/audit-logs",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/auth$/);
  }
  await expect(
    page.getByRole("button", { name: /sign in|log in/i }),
  ).toBeVisible();
});

test("signed-in reviewers reach the dashboard", async ({ page, signedIn }) => {
  void signedIn;
  await page.goto("/");
  await expect(page.getByText("Dashboard overview")).toBeVisible();
  await expect(
    page.getByText("Pending reviews", { exact: true }),
  ).toBeVisible();
});
