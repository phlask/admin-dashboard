import { expect, test } from "./fixtures";

test.beforeEach(async ({ signedIn }) => {
  void signedIn;
});

test("review actions show up in the audit log", async ({ page }) => {
  await page.goto("/audit-logs");
  await expect(
    page.getByText("No activity matches these filters."),
  ).toBeVisible();

  await page.goto("/reviews/7");
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page).toHaveURL(/\/reviews$/);

  await page.goto("/audit-logs");
  const table = page.locator("table");
  await expect(table.getByText("APPROVE", { exact: true })).toBeVisible();
  await expect(table.getByText("UPDATE", { exact: true })).toBeVisible();

  await page.goto("/audit-logs?action=APPROVE");
  await expect(page.getByText("Showing 1–1 of 1")).toBeVisible();

  await page.getByRole("button", { name: "Show details" }).click();
  await expect(page.getByText("review_status").last()).toBeVisible();
});
