import { expect, test } from "./fixtures";

// Version history and rollback (#4).

test.beforeEach(async ({ signedIn }) => {
  void signedIn;
});

test("rolls a resource back to an earlier approved version", async ({
  page,
  mockRequests,
}) => {
  await page.goto("/resources/1");
  await expect(
    page.getByRole("heading", { name: "Grace Cafe Philly" }),
  ).toBeVisible();

  const rows = page.locator("table tbody tr");
  await expect(rows).toHaveCount(3);
  await expect(rows.filter({ hasText: "#4" })).toContainText("Current version");
  await expect(rows.filter({ hasText: "#5" })).toContainText("Reason: Spam");

  await rows
    .filter({ hasText: "#3" })
    .getByRole("button", { name: "Roll back to this" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Name", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Guidelines", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Roll back", exact: true }).click();

  await expect(
    page.getByText("Rolled back to the version from edit #3."),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Grace Cafe" })).toBeVisible();
  await expect(rows.filter({ hasText: "#3" })).toContainText("Current version");

  const calls = await mockRequests("/rest/v1/rpc/rollback_to_edit");
  expect(calls.map((call) => call.body)).toEqual([
    { p_edit_id: 3, p_actor: "reviewer@phlask.org" },
  ]);
});

test("cancelling the dialog leaves the resource alone", async ({
  page,
  mockRequests,
}) => {
  await page.goto("/resources/1");
  await page
    .locator("table tbody tr", { hasText: "#3" })
    .getByRole("button", { name: "Roll back to this" })
    .click();
  await page.getByRole("button", { name: "Cancel" }).click();

  await expect(
    page.getByRole("heading", { name: "Grace Cafe Philly" }),
  ).toBeVisible();
  expect(await mockRequests("/rest/v1/rpc/rollback_to_edit")).toHaveLength(0);
});
