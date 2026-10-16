import { expect, test } from "./fixtures";

// Approve / reject / edit-before-approve flow for crowdsourced submissions (#9).

test.beforeEach(async ({ signedIn }) => {
  void signedIn;
});

test("queue splits new sites from edits and flags duplicates", async ({
  page,
}) => {
  await page.goto("/reviews");

  const newSites = page
    .getByText("New site submissions")
    .locator("xpath=..")
    .locator("table");
  await expect(newSites.getByText("Grace Cafe Phila")).toBeVisible();
  await expect(newSites.getByText(/#1 · \d+%/)).toBeVisible();

  const edits = page
    .getByText("Edits to existing resources")
    .locator("xpath=..")
    .locator("table");
  await expect(edits.getByText("Grace Cafe (Broad St)")).toBeVisible();
  // A name-only edit leaves resource_type NULL; the resource's type is shown.
  await expect(edits.getByText("WATER")).toBeVisible();
});

test("dashboard counts sparse edits under their resource's type", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("tr", { hasText: "WATER" })).toContainText("2");
});

test("shows only the fields an edit changes", async ({ page }) => {
  await page.goto("/reviews/7");

  await expect(page.getByText("1 of 15 fields changed")).toBeVisible();
  const table = page.locator("table").last();
  await expect(table.getByText("Changed")).toHaveCount(1);
  await expect(table.getByText("Grace Cafe Philly")).toBeVisible();

  await page.getByLabel("Show changed fields only").uncheck();
  // Unchanged fields show the current value as the proposal (NULL = no change).
  await expect(table.getByText("Bring your own container.")).toHaveCount(2);
});

test("approving applies only the changed fields", async ({
  page,
  mockRequests,
}) => {
  await page.goto("/reviews/7");
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page).toHaveURL(/\/reviews$/);

  const [call] = await mockRequests("/rest/v1/rpc/approve_edit");
  expect(call.body).toEqual({
    p_edit_id: 7,
    p_reviewer: "reviewer@phlask.org",
  });

  await page.goto("/resources/1");
  await expect(
    page.getByRole("heading", { name: "Grace Cafe (Broad St)" }),
  ).toBeVisible();
  // The fields the edit left out are untouched (#50).
  await expect(page.getByText(/55 North Broad Street/)).toBeVisible();
});

test("rejecting records the reason", async ({ page, mockRequests }) => {
  await page.goto("/reviews/7");
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await page.getByLabel("Reason (optional)").fill("Not a real name change");
  await page.getByRole("button", { name: "Reject edit" }).click();
  await expect(page).toHaveURL(/\/reviews$/);

  const [call] = await mockRequests("/rest/v1/rpc/reject_edit");
  expect(call.body).toEqual({
    p_edit_id: 7,
    p_reviewer: "reviewer@phlask.org",
    p_notes: "Not a real name change",
  });

  await page.goto("/reviews/7");
  await expect(page.getByText(/Rejected by reviewer@phlask.org/)).toBeVisible();
  await expect(page.getByText(/Reason: Not a real name change/)).toBeVisible();
});

test("saving reviewer tweaks sends only what changed", async ({
  page,
  mockRequests,
}) => {
  await page.goto("/reviews/7");
  await page.getByLabel("Show changed fields only").uncheck();

  const row = (label: string) =>
    page.locator("table").last().locator("tr", { hasText: label });
  await row("City").locator("textarea:not([aria-hidden])").fill("Phila");
  await row("Guidelines").locator("textarea:not([aria-hidden])").fill("");

  // Approval applies the saved proposal, so it's blocked until saved.
  await expect(page.getByRole("button", { name: "Approve" })).toBeDisabled();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Changes saved.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve" })).toBeEnabled();

  const patches = (await mockRequests("/rest/v1/resource_edits")).filter(
    (entry) => entry.method === "PATCH",
  );
  expect(patches).toHaveLength(1);
  expect(patches[0].body).toEqual({
    city: "Phila",
    guidelines: null,
    cleared_fields: ["guidelines"],
  });
});

test("a duplicate submission can be reviewed as an edit", async ({ page }) => {
  await page.goto("/reviews/8");
  await expect(page.getByText("Possible duplicates")).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Treat as edit of #1", exact: true })
    .click();

  await expect(page.getByText(/of 15 fields changed/)).toBeVisible();
  await expect(page.getByText("Possible duplicates")).toHaveCount(0);
});

test("lists other pending edits for the same resource", async ({ page }) => {
  await page.goto("/reviews/8");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Treat as edit of #1", exact: true })
    .click();
  await expect(page.getByText(/of 15 fields changed/)).toBeVisible();

  await page.goto("/reviews/7");
  await expect(
    page.getByText("Another pending edit targets this resource."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /#8/ })).toBeVisible();
});
