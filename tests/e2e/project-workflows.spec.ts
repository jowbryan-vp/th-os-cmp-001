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
  await expect(page.getByText("TH-2026-001", { exact: true })).toBeVisible();
  await expect(page.locator("article").filter({ hasText: "Reforma e Ampliação Residencial" }).getByText(/Cacoal/)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await resetDatabase(page);
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
});
