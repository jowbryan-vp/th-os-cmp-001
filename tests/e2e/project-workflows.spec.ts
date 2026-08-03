import { expect, test } from "@playwright/test";

async function resetDatabase(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Cadastro Mestre do Projeto" })).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("th-os");
        request.onsuccess = () => {
          const transaction = request.result.transaction("project-master-records", "readwrite");
          transaction.objectStore("project-master-records").clear();
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        };
        request.onerror = () => reject(request.error);
      }),
  );
  await page.reload();
  await expect(page.getByLabel("Aviso sobre armazenamento local")).toContainText(
    "Os dados ficam armazenados somente neste navegador e dispositivo.",
  );
  await expect(page.getByText("TH-2026-001", { exact: true })).toBeVisible();
  await expect(page.locator("article").filter({ hasText: "Reforma e Ampliação Residencial" }).getByText(/Cacoal/)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await resetDatabase(page);
});

test("loads the pilot without browser or framework errors", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);
  await expect(page.locator("body")).not.toHaveText("");
  await expect(page.locator("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Cadastro Mestre do Projeto" })).toBeVisible();
  expect(browserErrors).toEqual([]);

  if (process.env.PLAYWRIGHT_BASE_URL) {
    await page.screenshot({ path: "test-results/public-pilot.png", fullPage: true });
  }
});

test("keeps the logo header compact and the page scrollable", async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Cadastro Mestre do Projeto" })).toBeVisible();

    const header = page.locator("header.topbar");
    const headerBox = await header.boundingBox();
    expect(headerBox?.height).toBeLessThanOrEqual(96);

    const logoBox = await page.getByRole("button", { name: "Voltar para projetos" }).boundingBox();
    expect(logoBox).not.toBeNull();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.mouse.move((logoBox?.x ?? 0) + 10, (logoBox?.y ?? 0) + 10);
    await page.mouse.wheel(0, 700);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  }
});

test("creates, autosaves, and restores a project after reload", async ({ page }) => {
  await page.getByRole("button", { name: "Novo projeto" }).click();
  await expect(page.getByText(/TH-\d{4}-002/, { exact: true }).first()).toBeVisible();

  await page.getByLabel("Nome interno").fill("Casa Rio Negro");
  await expect(page.getByText("Salvo neste dispositivo")).toBeVisible();

  await page.getByRole("button", { name: /Projetos/ }).click();
  await expect(page.getByRole("heading", { name: "Casa Rio Negro" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Casa Rio Negro" })).toBeVisible();
});

test("archives, restores, and permanently deletes a project", async ({ page }) => {
  const pilot = page.locator("article").filter({ hasText: "Reforma e Ampliação Residencial" });

  await pilot.getByRole("button", { name: "Arquivar" }).click();
  await expect(page.getByText("Projeto arquivado.")).toBeVisible();
  await expect(pilot).toBeHidden();

  await page.getByLabel("Status").selectOption("all");
  await expect(pilot.getByText("Arquivado", { exact: true }).first()).toBeVisible();

  await pilot.getByRole("button", { name: "Restaurar" }).click();
  await expect(page.getByText("Projeto restaurado.")).toBeVisible();
  await expect(pilot.getByText("Ativo", { exact: true })).toBeVisible();

  await pilot.getByRole("button", { name: "Arquivar" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await pilot.getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByText("Cadastro excluído.")).toBeVisible();
  await expect(pilot).toHaveCount(0);
});

test("imports a valid project JSON", async ({ page }) => {
  const imported = {
    id: "project-imported-e2e",
    schemaVersion: 1,
    code: "TH-2099-999",
    title: "Projeto importado E2E",
  };

  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Importar JSON" }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: "project.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(imported)),
  });

  await expect(page.getByText("Cadastro TH-2099-999 importado.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Projeto importado E2E" })).toBeVisible();
  await expect(page.getByText("TH-2099-999", { exact: true }).first()).toBeVisible();
});

test("exports the versioned project envelope", async ({ page }) => {
  const pilot = page.locator("article").filter({ hasText: "Reforma e Ampliação Residencial" });
  await pilot.locator("button.project-card__open").click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar JSON" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let contents = "";
  for await (const chunk of stream) contents += chunk.toString();
  const envelope = JSON.parse(contents);
  expect(envelope.application).toBe("TH-OS-CMP-001");
  expect(envelope.schemaVersion).toBe(2);
  expect(envelope.project.code).toBe("TH-2026-001");
});

test("keeps functional content available on tablet and mobile", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1000 });
  await expect(page.getByRole("heading", { name: "Cadastro Mestre do Projeto" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  const pilot = page.locator("article").filter({ hasText: "Reforma e Ampliação Residencial" });
  await pilot.locator("button.project-card__open").click();
  await expect(page.getByRole("heading", { name: "1. Identificação" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "14. Histórico" })).toBeAttached();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("th-2026-001-cmp.json");
});

test("keeps projects isolated between browser contexts", async ({ browser }) => {
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const firstPage = await firstContext.newPage();
  const secondPage = await secondContext.newPage();

  try {
    await firstPage.goto("/");
    await secondPage.goto("/");
    await expect(firstPage.getByText("TH-2026-001", { exact: true })).toBeVisible();
    await expect(secondPage.getByText("TH-2026-001", { exact: true })).toBeVisible();

    await firstPage.getByRole("button", { name: "Novo projeto" }).click();
    await firstPage.getByLabel("Nome interno").fill("Projeto isolado E2E");
    await expect(firstPage.getByText("Salvo neste dispositivo")).toBeVisible();
    await firstPage.getByRole("button", { name: /Projetos/ }).click();
    await expect(firstPage.getByRole("heading", { name: "Projeto isolado E2E" })).toBeVisible();

    await secondPage.reload();
    await expect(secondPage.getByText("Projeto isolado E2E")).toHaveCount(0);
  } finally {
    await firstContext.close();
    await secondContext.close();
  }
});
