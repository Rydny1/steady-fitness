import { expect, test } from "@playwright/test";

// Signed-out smoke tests. Nothing here needs an account.

test.describe("signed out", () => {
  test("/login renders the form", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("/signup renders with the consent checkbox", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByLabel("Email")).toBeVisible();
    const consent = page.locator('input[type="checkbox"][name="agree"]');
    await expect(consent).toBeVisible();
    await expect(consent).not.toBeChecked();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  });

  test("/privacy renders", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
  });

  test("/today redirects to /login when signed out", async ({ page }) => {
    await page.goto("/today");
    await expect(page).toHaveURL(/\/login/);
  });

  test("manifest is valid", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBe(true);
    const m = await res.json();
    expect(m.name).toBe("Steady");
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/today");
    const sizes = (m.icons as { sizes: string }[]).map((i) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    for (const icon of m.icons as { src: string }[]) {
      expect((await request.get(icon.src)).ok(), icon.src).toBe(true);
    }
  });

  test("/sw.js is served with no-cache", async ({ request }) => {
    const res = await request.get("/sw.js");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toContain("no-cache");
    expect(res.headers()["content-type"]).toContain("javascript");
  });
});

// Needs a TOTP secret: sign-in requires an authenticator code for every account.
// Set QA_EMAIL, QA_PASSWORD and QA_TOTP_SECRET in the environment, add an otplib
// style generator, then remove test.skip. Not runnable without them.
test.skip("signed in: tap-log a food, calories change, log a weight, open every tab", async ({ page }) => {
  const { QA_EMAIL, QA_PASSWORD, QA_TOTP_SECRET } = process.env;
  test.skip(!QA_EMAIL || !QA_PASSWORD || !QA_TOTP_SECRET, "needs QA_EMAIL, QA_PASSWORD, QA_TOTP_SECRET");
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("/login");
  await page.getByLabel("Email").fill(QA_EMAIL!);
  await page.getByLabel("Password").fill(QA_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  // TODO: enter the 6 digit code generated from QA_TOTP_SECRET on /mfa.
  for (const tab of ["Today", "Train", "Fuel", "Progress"]) {
    await page.getByRole("link", { name: tab }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  }
  expect(errors).toEqual([]);
});
