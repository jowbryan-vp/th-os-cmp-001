import { expect, test } from "@playwright/test";

test.describe("DS-001 showcase", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/design-system");
    await expect(page.getByRole("heading", { name: "Design System", exact: true })).toBeVisible();
    await expect(page.locator("main.ds-showcase")).toHaveAttribute("data-ready", "true", { timeout: 15_000 });
  });

  test("supports button states, keyboard tabs, menu, toast and focus restoration", async ({ page }) => {
    await page.getByRole("button", { name: "Salvar exemplo" }).click();
    await expect(page.locator(".ds-toast")).toContainText("Ação concluída");
    await page.getByRole("button", { name: "Fechar aviso" }).click();
    const disabled = page.getByRole("button", { name: "Desabilitado" });
    await expect(disabled).toBeDisabled();
    await expect(page.getByRole("button", { name: "Carregando" })).toHaveAttribute("aria-busy", "true");

    const componentsTab = page.getByRole("tab", { name: "Componentes" });
    await componentsTab.click();
    await componentsTab.focus();
    await componentsTab.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Tokens" })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("tab", { name: "Tokens" }).press("End");
    await expect(page.getByRole("tab", { name: "Uso correto" })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("tab", { name: "Uso correto" }).press("Home");
    await expect(componentsTab).toHaveAttribute("aria-selected", "true");

    await page.getByRole("button", { name: "Mais ações" }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();

    const trigger = page.getByRole("button", { name: "Abrir confirmação" });
    await trigger.focus();
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Excluir exemplo?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Fechar diálogo" })).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "Fechar diálogo" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    await page.getByRole("button", { name: "Salvar exemplo" }).click();
    await expect(page.locator(".ds-toast")).toContainText("Ação concluída");
  });

  test("has no horizontal page overflow at the required responsive widths", async ({ page }) => {
    const widths = [320, 375, 768, 1024, 1280, 1440, 1920];
    for (const width of widths) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      await expect(page.getByRole("heading", { name: "Botões" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `${width}px`).toBe(true);
    }
  });

  test("matches desktop reference states", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page).toHaveScreenshot("ds-showcase-desktop.png", { fullPage: true, animations: "disabled" });
    await page.getByRole("button", { name: "Abrir confirmação" }).click();
    await expect(page).toHaveScreenshot("ds-modal-desktop.png", { fullPage: true, animations: "disabled" });
  });

  test("matches mobile reference states", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page).toHaveScreenshot("ds-showcase-mobile.png", { fullPage: true, animations: "disabled" });
    await page.getByRole("button", { name: "Abrir confirmação" }).click();
    await expect(page).toHaveScreenshot("ds-modal-mobile.png", { fullPage: true, animations: "disabled" });
  });
});
