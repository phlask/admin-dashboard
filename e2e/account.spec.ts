import { expect, test } from "./fixtures";

test.beforeEach(async ({ signedIn }) => {
  void signedIn;
});

test("password change requires the current password", async ({
  page,
  mockRequests,
}) => {
  await page.goto("/account");

  const fill = async (current: string, next: string, confirm: string) => {
    await page.getByLabel(/^Current password/).fill(current);
    await page.getByLabel(/^New password/).fill(next);
    await page.getByLabel(/^Confirm new password/).fill(confirm);
    await page.getByRole("button", { name: "Change password" }).click();
  };

  await fill("wrong-password", "brand-new-pass", "brand-new-pass");
  await expect(page.getByText("Current password is incorrect")).toBeVisible();

  await fill("correct-horse", "brand-new-pass", "typo-pass");
  await expect(page.getByText("Passwords do not match")).toBeVisible();

  await fill("correct-horse", "brand-new-pass", "brand-new-pass");
  await expect(page.getByText("Password changed.")).toBeVisible();

  const updates = (await mockRequests("/auth/v1/user")).filter(
    (entry) => entry.method === "PUT",
  );
  expect(updates).toHaveLength(1);
  expect(updates[0].body).toMatchObject({ password: "brand-new-pass" });
});
