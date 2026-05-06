import { expect, test, type Page } from "@playwright/test";

async function selectStudyLanguageTopbar(page: Page, code: string) {
  const respPromise = page.waitForResponse(
    (r) => r.url().includes("/api/study-language") && r.request().method() === "POST",
    { timeout: 60_000 },
  );
  await page.locator("#study-lang-topbar").selectOption(code);
  await respPromise;
}

test.describe("hardening user journey", () => {
  test.setTimeout(180_000);

  test("register → language totals → hiragana learned → SRS → toggle studying → stats scope", async ({
    page,
  }) => {
    const id = Date.now();
    const email = `e2e-${id}@example.com`;

    await page.goto("/register");
    await page.locator("#name").fill("Playwright User");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill("password12");
    await page.locator('button[type="submit"]').click();

    await page.waitForURL("**/dashboard", { timeout: 90_000 });
    await page.locator(".dashboard-lang-settings").scrollIntoViewIfNeeded();

    const zhRow = page.getByTestId("dashboard-lang-settings-zh");
    await expect(zhRow.getByTestId("dashboard-include-total-zh")).toBeEnabled({ timeout: 60_000 });

    const jaRow = page.getByTestId("dashboard-lang-settings-ja");
    await expect(jaRow.getByTestId("dashboard-include-total-ja")).toBeChecked();

    await expect(zhRow.getByTestId("dashboard-include-total-zh")).toBeChecked();
    await zhRow.getByTestId("dashboard-include-total-zh").click();
    await expect(zhRow.getByTestId("dashboard-include-total-zh")).not.toBeChecked({ timeout: 60_000 });
    await expect(zhRow.getByTestId("dashboard-include-total-zh")).toBeEnabled();
    await zhRow.getByTestId("dashboard-include-total-zh").click();
    await expect(zhRow.getByTestId("dashboard-include-total-zh")).toBeChecked({ timeout: 60_000 });

    await page.goto("/learn/ja/hiragana");
    await page.locator('button[aria-label="Tandai sudah dikuasai"]').first().click();

    await page.goto("/learn/ja/hiragana?tab=srs");
    await page.getByRole("button", { name: /Tampilkan jawaban/i }).click();
    await page.locator('[data-rating="2"]').click();

    await page.goto("/dashboard");
    await expect(page.locator("#study-lang-topbar")).toBeVisible();
    await selectStudyLanguageTopbar(page, "ko");
    await page.waitForURL(/\/learn\/ko\b/, { timeout: 60_000 });

    await page.locator("#sidebar").getByRole("link", { name: /Dashboard/i }).click();
    await page.waitForURL("**/dashboard", { timeout: 60_000 });
    await selectStudyLanguageTopbar(page, "ja");
    await page.waitForURL(/\/learn\/ja\b/, { timeout: 60_000 });

    await page.locator("#sidebar").getByRole("link", { name: /Statistik/i }).click();
    await page.waitForURL(/\/stats\b/, { timeout: 60_000 });
    await page.getByRole("navigation", { name: "Cakupan statistik" }).getByRole("link", { name: /日本語/ }).click();
    await page.waitForURL(/\bscope=ja\b/, { timeout: 60_000 });

    await expect(page.getByRole("heading", { name: "Statistik" })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Cakupan statistik" }).locator("a.module-tab-active"),
    ).toContainText("日本語");
  });
});
