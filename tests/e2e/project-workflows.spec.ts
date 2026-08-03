import { expect, test } from "@playwright/test";

async function resetDatabase(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Cadastro Mestre do Projeto" })).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("th-os");
        request.onsuccess = () => {
          const stores = ["project-master-records", "parametric-studies", "reference-catalog-options"].filter((name) => request.result.objectStoreNames.contains(name));
          const transaction = request.result.transaction(stores, "readwrite");
          transaction.objectStore("project-master-records").clear();
          if (stores.includes("parametric-studies")) transaction.objectStore("parametric-studies").clear();
          if (stores.includes("reference-catalog-options")) transaction.objectStore("reference-catalog-options").clear();
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
  expect(envelope.parametricStudies).toEqual([]);
});

test("exports and restores a complete browser backup", async ({ page }) => {
  await page.getByRole("button", { name: "Novo projeto" }).click();
  await page.getByLabel("Nome interno").fill("Projeto do backup E2E");
  await expect(page.getByText("Salvo neste dispositivo")).toBeVisible();
  await page.getByRole("button", { name: /Projetos/ }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar backup completo" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const buffer = Buffer.concat(chunks);
  const envelope = JSON.parse(buffer.toString());
  expect(envelope.kind).toBe("consolidated-backup");
  expect(envelope.backupSchemaVersion).toBe(3);
  expect(envelope.referenceCatalogOptions.length).toBeGreaterThan(0);
  expect(envelope.projectRecords).toHaveLength(2);
  expect(envelope.parametricStudies).toEqual([]);
  expect(envelope.capLibraryReferences).toHaveLength(1);

  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("th-os");
    request.onsuccess = () => {
      const transaction = request.result.transaction("project-master-records", "readwrite");
      transaction.objectStore("project-master-records").clear();
      transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error);
    };
    request.onerror = () => reject(request.error);
  }));

  page.once("dialog", (dialog) => dialog.accept());
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Restaurar backup" }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: "backup.json", mimeType: "application/json", buffer });
  await expect(page.getByText("Backup restaurado com 2 cadastro(s) e 0 estudo(s).")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Projeto do backup E2E" })).toBeVisible();
  await expect(page.getByText("TH-2026-001", { exact: true })).toBeVisible();
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

test("calculates, compares, accumulates three CAP-001 areas and restores scenarios", async ({ page }) => {
  const pilot = page.locator("article").filter({ hasText: "Reforma e Ampliação Residencial" });
  await pilot.locator("button.project-card__open").click();
  await page.getByRole("button", { name: "+ Ambiente" }).click();
  await page.getByRole("combobox", { name: "Ambiente", exact: true }).last().fill("Suíte");
  await expect(page.getByText("Salvo neste dispositivo")).toBeVisible();
  await page.getByRole("button", { name: "Pré-dimensionar com CAP-001" }).click();
  await expect(page.getByRole("heading", { name: "Biblioteca e Calculadora Paramétrica" })).toBeVisible();

  await page.getByLabel("Nome do cenário").fill("King + armário");
  await page.getByRole("button", { name: "Calcular e revisar" }).click();
  await expect(page.getByText("Cenário calculado. Revise premissas e alertas.")).toBeVisible();
  await page.getByRole("button", { name: "Duplicar cenário" }).click();
  await page.getByLabel("Nome do cenário").fill("Queen + closet");
  await page.getByRole("checkbox", { name: "Cama King Size" }).uncheck();
  await page.getByRole("checkbox", { name: "Guarda-Roupas Porta de Abrir" }).uncheck();
  await page.getByRole("checkbox", { name: "Cama Queen Size" }).check();
  await page.getByRole("checkbox", { name: "Módulo de Closet Aberto" }).check();
  await page.getByRole("button", { name: "Calcular e revisar" }).click();

  await page.getByRole("button", { name: "Comparador" }).click();
  await expect(page.getByRole("columnheader", { name: "King + armário" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /Queen \+ closet/ })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Diferença vs. cenário A" })).toBeVisible();
  await page.getByRole("button", { name: "Calculadora", exact: true }).click();
  await page.getByRole("button", { name: "Registrar as 3 áreas" }).click();
  await expect(page.getByText("As três áreas CAP-001 foram registradas. Escolha uma opção no ambiente quando estiver pronto.")).toBeVisible();
  await expect(page.getByText("Total mínimo")).toBeVisible();
  await expect(page.getByText("Total recomendado")).toBeVisible();
  await expect(page.getByText("Total bruto preliminar")).toBeVisible();
  await expect(page.getByText("Somente ambientes calculados pelo CAP-001: 1 de 1. Os totais consideram a quantidade.")).toBeVisible();
  const recommendedOption = page.getByRole("button", { name: /Recomendada · .* m²/ });
  await recommendedOption.click();
  await expect(recommendedOption).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(/biblioteca 1\.1\.0 · motor 1\.0\.0/)).toBeVisible();

  await page.reload();
  await page.locator("article").filter({ hasText: "Reforma e Ampliação Residencial" }).locator("button.project-card__open").click();
  await expect(page.getByText(/biblioteca 1\.1\.0 · motor 1\.0\.0/)).toBeVisible();
  await page.getByRole("button", { name: /Projetos/ }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar backup completo" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream(); const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const buffer = Buffer.concat(chunks); const envelope = JSON.parse(buffer.toString());
  expect(envelope.parametricStudies).toHaveLength(1);
  expect(envelope.projectRecords[0].needsProgram.some((item: { parametricStudyId: string | null }) => item.parametricStudyId)).toBe(true);

  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("th-os"); request.onsuccess = () => {
      const transaction = request.result.transaction(["project-master-records", "parametric-studies"], "readwrite");
      transaction.objectStore("project-master-records").clear(); transaction.objectStore("parametric-studies").clear();
      transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error);
    }; request.onerror = () => reject(request.error);
  }));
  page.once("dialog", (dialog) => dialog.accept());
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Restaurar backup" }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: "cap-backup.json", mimeType: "application/json", buffer });
  await expect(page.getByText("Backup restaurado com 1 cadastro(s) e 1 estudo(s).")).toBeVisible();
  await page.locator("article").filter({ hasText: "Reforma e Ampliação Residencial" }).locator("button.project-card__open").click();
  await expect(page.getByText(/biblioteca 1\.1\.0 · motor 1\.0\.0/)).toBeVisible();
});

test("shows comfort and accessibility choices and advances to the next environment", async ({ page }) => {
  const pilot = page.locator("article").filter({ hasText: "Reforma e Ampliação Residencial" });
  await pilot.locator("button.project-card__open").click();
  await page.getByRole("button", { name: "+ Ambiente" }).click();
  await page.getByRole("combobox", { name: "Ambiente", exact: true }).last().fill("Varanda Gourmet");
  await expect(page.getByText("Salvo neste dispositivo")).toBeVisible();
  await page.getByRole("button", { name: "Pré-dimensionar com CAP-001" }).click();

  await expect(page.getByRole("radio", { name: /Mínimo \/ compacto/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Confortável \/ recomendado/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /Generoso/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Acessível — referência NBR 9050/ })).toBeVisible();
  await page.getByRole("radio", { name: /Mínimo \/ compacto/ }).check();
  await page.getByRole("radio", { name: /Acessível — referência NBR 9050/ }).check();
  await page.getByRole("button", { name: "Calcular, registrar e próximo ambiente →" }).click();

  await expect(page.getByText("Ambiente registrado. Configure agora o próximo ambiente.")).toBeVisible();
  await expect(page.getByLabel("Item do programa").locator("option")).toHaveCount(3);
  await expect(page.getByLabel("Item do programa").locator("option:checked")).toHaveText("Ambiente sem nome");
  await expect(page.getByText("Configure os itens e calcule o cenário.")).toBeVisible();

  const environment = page.getByRole("combobox", { name: "Ambiente", exact: true });
  await environment.selectOption({ label: "Piscina — Espelho d’água" });
  await expect(page.getByLabel("Largura do espelho d’água (m)")).toBeVisible();
  await page.getByLabel("Largura do espelho d’água (m)").fill("4");
  await page.getByLabel("Comprimento do espelho d’água (m)").fill("8");
  await page.getByRole("button", { name: "Calcular e revisar" }).click();
  await expect(page.getByText("32,00 m²", { exact: true }).first()).toBeVisible();
});

test("CAP accepts 0,60 x 1,60 and stays usable across desktop, zoom equivalents, tablet and mobile", async ({ page }) => {
  await page.getByRole("button", { name: "CAP-001" }).click();
  await page.getByRole("button", { name: "Calculadora", exact: true }).click();
  const environment = page.getByRole("combobox", { name: "Ambiente", exact: true });
  await environment.selectOption({ label: "Sala de Estar / Home Theater" });
  await page.getByRole("checkbox", { name: /Sofá 3 Lugares/ }).check();
  await page.getByLabel("Quantidade de Poltrona Individual").fill("2");
  await page.getByLabel("Nome", { exact: true }).fill("Mesa especial");
  await page.getByLabel("Largura (m)").fill("0,60");
  await page.getByLabel("Comprimento (m)").fill("1,60");
  await page.getByRole("button", { name: "Adicionar item" }).click();
  await expect(page.locator(".cap-custom-item__row").filter({ hasText: "Mesa especial" })).toContainText("0,6 × 1,6 m");
  await page.getByRole("button", { name: "Calcular e revisar" }).click();
  await expect(page.getByText("Cenário calculado. Revise premissas e alertas.")).toBeVisible();
  await expect(page.getByText(/não foi possível calcular/i)).toHaveCount(0);

  const viewports = [
    { name: "1920x1080", width: 1920, height: 1080 }, { name: "1440x900", width: 1440, height: 900 },
    { name: "1366x768", width: 1366, height: 768 }, { name: "zoom-125", width: 1152, height: 720 },
    { name: "zoom-150", width: 960, height: 600 }, { name: "tablet", width: 820, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport); await expect(page.locator(".cap-result-panel")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    expect(await page.evaluate(() => [...document.querySelectorAll(".cap-config-panel input,.cap-config-panel select,.cap-config-panel button")]
      .every((element) => { const rect = element.getBoundingClientRect(); return rect.left >= -1 && rect.right <= document.documentElement.clientWidth + 1; }))).toBe(true);
    await page.screenshot({ path: `test-results/cap-${viewport.name}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Salvar estudo" }).click();
  await expect(page.getByText("Estudo salvo neste dispositivo.")).toBeVisible();
  await page.getByRole("button", { name: "Duplicar cenário" }).click();
  await expect(page.locator(".cap-custom-item__row").filter({ hasText: "Mesa especial" })).toContainText("0,6 × 1,6 m");
  await page.getByRole("button", { name: "Salvar estudo" }).click();
  await page.reload(); await page.getByRole("button", { name: "CAP-001" }).click();
  await page.getByRole("button", { name: "Estudos do projeto" }).click();
  await page.getByRole("button", { name: "Abrir" }).click();
  await expect(page.locator(".cap-custom-item__row").filter({ hasText: "Mesa especial" })).toContainText("0,6 × 1,6 m");
});

test("catalog combobox selects presets, creates a city linked to RO and keeps it after reload", async ({ page }) => {
  await page.locator("article").filter({ hasText: "Reforma e Ampliação Residencial" }).locator("button.project-card__open").click();
  const state = page.getByRole("combobox", { name: "Estado", exact: true });
  await state.fill("Rondônia"); await state.press("ArrowDown"); await state.press("Enter");
  const city = page.getByRole("combobox", { name: "Cidade", exact: true });
  await city.fill("Nova União");
  await page.getByRole("button", { name: /Adicionar “Nova União”/ }).click();
  await expect(city).toHaveValue("Nova União"); await city.blur();
  await expect.poll(() => page.evaluate(() => new Promise<string>((resolve, reject) => {
    const request = indexedDB.open("th-os"); request.onsuccess = () => {
      const get = request.result.transaction("project-master-records").objectStore("project-master-records").get("project-th-2026-001");
      get.onsuccess = () => resolve(get.result?.property?.city ?? ""); get.onerror = () => reject(get.error);
    }; request.onerror = () => reject(request.error);
  })), { timeout: 5_000 }).toBe("Nova União");
  await page.reload();
  await page.locator("article").filter({ hasText: "Reforma e Ampliação Residencial" }).locator("button.project-card__open").click();
  const restoredCity = page.getByRole("combobox", { name: "Cidade", exact: true });
  await expect(restoredCity).toHaveValue("Nova União");
  await restoredCity.press("ArrowDown"); await expect(page.getByRole("option", { name: "Nova União" })).toBeVisible();
  await restoredCity.press("Escape"); await expect(restoredCity).toHaveAttribute("aria-expanded", "false");
});

test("keeps the CAP-001 library usable on tablet and mobile", async ({ page }) => {
  for (const viewport of [{ width: 820, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport); await page.reload();
    await page.getByRole("button", { name: "CAP-001" }).click();
    await expect(page.getByRole("heading", { name: "Biblioteca e Calculadora Paramétrica" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Dormitório Casal/ })).toBeVisible();
    await page.getByRole("button", { name: "← Voltar ao CMP" }).click();
  }
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
