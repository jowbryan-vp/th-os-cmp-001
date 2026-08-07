import { expect, test } from "@playwright/test";

async function resetDatabase(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Cadastro Mestre do Projeto" })).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("th-os");
        request.onsuccess = () => {
          const stores = ["project-master-records", "parametric-studies", "reference-catalog-options", "fee-studies", "fee-scenarios", "structure-profiles", "service-catalog", "fee-snapshots", "payment-plans", "fee-calibration-records"].filter((name) => request.result.objectStoreNames.contains(name));
          const transaction = request.result.transaction(stores, "readwrite");
          for (const store of stores) transaction.objectStore(store).clear();
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

  await pilot.getByRole("button", { name: "Ações" }).click();
  await pilot.getByRole("menuitem", { name: "Arquivar" }).click();
  await expect(page.getByText("Projeto arquivado.")).toBeVisible();
  await expect(pilot).toBeHidden();

  await page.getByLabel("Status").selectOption("all");
  await expect(pilot.getByText("Arquivado", { exact: true }).first()).toBeVisible();

  await pilot.getByRole("button", { name: "Ações" }).click();
  await pilot.getByRole("menuitem", { name: "Restaurar" }).click();
  await expect(page.getByText("Projeto restaurado.")).toBeVisible();
  await expect(pilot.getByText("Ativo", { exact: true })).toBeVisible();

  await pilot.getByRole("button", { name: "Ações" }).click();
  await pilot.getByRole("menuitem", { name: "Arquivar" }).click();
  await pilot.getByRole("button", { name: "Ações" }).click();
  await pilot.getByRole("menuitem", { name: "Excluir definitivamente" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Excluir definitivamente" }).click();
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
  expect(envelope.backupSchemaVersion).toBe(4);
  // honSchemaVersion 2 desde o HON-002B (catálogo com category/descrições/entregáveis).
  expect(envelope.honSchemaVersion).toBe(2);
  expect(envelope.feeStudies).toEqual([]);
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

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
}

test("keeps the client 'Remover' button fully inside its card across viewports", async ({ page }) => {
  const pilot = page.locator("article").filter({ hasText: "Reforma e Ampliação Residencial" });
  await pilot.locator("button.project-card__open").click();
  await page.getByRole("link", { name: "Clientes" }).click();

  for (const viewport of [{ width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expectNoHorizontalOverflow(page);

    const card = page.locator("#clients .collection-card").first();
    const removeButton = card.getByRole("button", { name: "Remover" });
    await expect(removeButton).toBeVisible();
    await expect(removeButton).toHaveText(/Remover/);

    const cardBox = (await card.boundingBox())!;
    const buttonBox = (await removeButton.boundingBox())!;
    expect(buttonBox.x).toBeGreaterThanOrEqual(cardBox.x - 1);
    expect(buttonBox.y).toBeGreaterThanOrEqual(cardBox.y - 1);
    expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width + 1);
    expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(cardBox.y + cardBox.height + 1);
  }
});

test("keeps history event, description and date separated without overlap", async ({ page }) => {
  const pilot = page.locator("article").filter({ hasText: "Reforma e Ampliação Residencial" });
  await pilot.locator("button.project-card__open").click();

  await page.getByRole("link", { name: "Identificação" }).click();
  await page.getByLabel("Fase").selectOption("survey");

  await page.getByRole("link", { name: "Histórico" }).click();
  const rows = page.locator("#history .history-row");
  await expect(rows).toHaveCount(2);

  for (const viewport of [{ width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expectNoHorizontalOverflow(page);

    for (const row of await rows.all()) {
      const eventBox = (await row.locator("strong").boundingBox())!;
      const descriptionBox = (await row.locator("p").boundingBox())!;
      const dateBox = (await row.locator("time").boundingBox())!;
      const intersects = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
        a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
      expect(intersects(eventBox, descriptionBox)).toBe(false);
      expect(intersects(descriptionBox, dateBox)).toBe(false);
      await expect(row.locator("time")).toBeVisible();
    }
  }

  await expect(rows.first().locator("strong")).toHaveText("phase_changed");
  await expect(rows.first().locator("p")).toHaveText("Fase alterada para Levantamento.");
});

test("calculates, compares, accumulates three CAP-001 areas and restores scenarios", async ({ page }) => {
  const pilot = page.locator("article").filter({ hasText: "Reforma e Ampliação Residencial" });
  await pilot.locator("button.project-card__open").click();
  await page.getByRole("button", { name: "Ambiente", exact: true }).click();
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

  await page.getByRole("tab", { name: "Comparador" }).click();
  await expect(page.getByRole("tab", { name: "Comparador" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("columnheader", { name: "King + armário" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /Queen \+ closet/ })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Diferença vs. cenário A" })).toBeVisible();
  await page.getByRole("tab", { name: "Calculadora", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Calculadora", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Registrar as 3 áreas" }).click();
  await expect(page.getByText("As três áreas CAP-001 foram registradas. Escolha uma opção no ambiente quando estiver pronto.")).toBeVisible();
  await expect(page.getByText("Total mínimo")).toBeVisible();
  await expect(page.getByText("Total recomendado")).toBeVisible();
  await expect(page.getByText("Total bruto preliminar")).toBeVisible();
  await expect(page.getByText("Somente ambientes calculados pelo CAP-001: 1 de 1. Os totais consideram a quantidade.")).toBeVisible();
  const recommendedOption = page.getByRole("button", { name: /Recomendada · .* m²/ });
  await recommendedOption.click();
  await expect(recommendedOption).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(/biblioteca 1\.2\.0 · motor 1\.0\.0/)).toBeVisible();

  await page.reload();
  await page.locator("article").filter({ hasText: "Reforma e Ampliação Residencial" }).locator("button.project-card__open").click();
  await expect(page.getByText(/biblioteca 1\.2\.0 · motor 1\.0\.0/)).toBeVisible();
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
  await expect(page.getByText(/biblioteca 1\.2\.0 · motor 1\.0\.0/)).toBeVisible();
});

test("shows comfort and accessibility choices and advances to the next environment", async ({ page }) => {
  const pilot = page.locator("article").filter({ hasText: "Reforma e Ampliação Residencial" });
  await pilot.locator("button.project-card__open").click();
  await page.getByRole("button", { name: "Ambiente", exact: true }).click();
  await page.getByRole("combobox", { name: "Ambiente", exact: true }).last().fill("Varanda Gourmet");
  await expect(page.getByText("Salvo neste dispositivo")).toBeVisible();
  await page.getByRole("button", { name: "Pré-dimensionar com CAP-001" }).click();

  const report = page.getByLabel("Relatório acumulado do Programa de Necessidades");
  await expect(report.getByRole("heading", { name: "Relatório acumulado" })).toBeVisible();
  await expect(report.getByText("Líquida mínima")).toBeVisible();
  await expect(report.getByText("Líquida recomendada")).toBeVisible();
  await expect(report.getByText("Bruta preliminar")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Mínimo \/ compacto/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Confortável \/ recomendado/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /Generoso/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Acessível — referência NBR 9050/ })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /Mesa de Jantar 6 Lugares Retangular/ })).toBeChecked();
  await page.getByRole("checkbox", { name: /Mesa de Jantar Retangular 12 Lugares/ }).check();
  await expect(page.getByRole("checkbox", { name: /Mesa de Jantar 6 Lugares Retangular/ })).not.toBeChecked();
  await page.locator("details").filter({ hasText: /^Ilhas/ }).locator("summary").click();
  await page.locator("details").filter({ hasText: /^Fornos/ }).locator("summary").click();
  await page.getByRole("checkbox", { name: /Ilha Gourmet com Cooktop e Pia/ }).check();
  await page.getByRole("checkbox", { name: /Forno de Pizza a Lenha/ }).check();
  await expect(page.getByRole("checkbox", { name: /Churrasqueira em Alvenaria/ })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /Ilha Gourmet com Cooktop e Pia/ })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /Forno de Pizza a Lenha/ })).toBeChecked();
  await page.getByRole("radio", { name: /Mínimo \/ compacto/ }).check();
  await page.getByRole("radio", { name: /Acessível — referência NBR 9050/ }).check();
  await page.getByRole("button", { name: "Calcular, registrar e próximo ambiente" }).click();

  await expect(page.getByText("Ambiente registrado. Configure agora o próximo ambiente.")).toBeVisible();
  await expect(report.getByText("1 de 1 ambiente(s) calculado(s)")).toBeVisible();
  await expect(report.locator("article")).toHaveCount(1);
  await expect(report.locator("article").first()).toContainText("Varanda Gourmet");
  await expect(page.getByLabel("Ambiente que será calculado").locator("option")).toHaveCount(2);
  await expect(page.getByLabel("Ambiente que será calculado").locator("option:checked")).toHaveText("+ Criar novo ambiente");
  await expect(page.getByText("Configure os itens e calcule o cenário.")).toBeVisible();

  await report.locator("article").first().getByRole("button", { name: "Editar" }).click();
  await expect(report.locator("article").first()).toHaveClass(/is-current/);
  await expect(page.getByLabel("Ambiente que será calculado").locator("option:checked")).toHaveText("Editar: Varanda Gourmet");
  await report.locator("article").first().getByRole("button", { name: "Excluir" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Excluir ambiente" }).click();
  await expect(report.locator("article")).toHaveCount(0);
  await expect(page.getByText(/Varanda Gourmet excluído/)).toBeVisible();

  const environment = page.getByRole("combobox", { name: "Ambiente", exact: true });
  await environment.selectOption({ label: "Piscina — Espelho d’água" });
  await expect(page.getByText(/Para completar o conjunto, adicione também Deck \/ Solário e Casa de Máquinas/)).toBeVisible();
  await expect(page.getByLabel("Largura do espelho d’água (m)")).toBeVisible();
  await page.getByRole("checkbox", { name: /Piscina Residencial Média/ }).check();
  await expect(page.getByLabel("Largura do espelho d’água (m)")).toHaveValue("4");
  await expect(page.getByLabel("Comprimento do espelho d’água (m)")).toHaveValue("8");
  await page.getByRole("button", { name: "Calcular e revisar" }).click();
  await expect(page.getByText("32,00 m²", { exact: true }).first()).toBeVisible();
});

test("registers and advances when CAP-001 starts without a linked program item", async ({ page }) => {
  await page.getByRole("button", { name: "CAP-001" }).click();
  await page.getByRole("tab", { name: "Calculadora", exact: true }).click();

  await expect(page.getByLabel("Ambiente que será calculado").locator("option:checked")).toHaveText("+ Criar novo ambiente");
  const advance = page.getByRole("button", { name: "Calcular, registrar e próximo ambiente" });
  await expect(advance).toBeEnabled();
  await advance.click();

  const report = page.getByLabel("Relatório acumulado do Programa de Necessidades");
  await expect(page.getByText("Ambiente registrado. Configure agora o próximo ambiente.")).toBeVisible();
  await expect(report.getByText("1 de 1 ambiente(s) calculado(s)")).toBeVisible();
  await expect(report.locator("article")).toHaveCount(1);
  await expect(report.locator("article").first()).toContainText("Dormitório Casal / Suíte");
  await expect(page.getByLabel("Ambiente que será calculado").locator("option:checked")).toHaveText("+ Criar novo ambiente");

  await page.getByRole("button", { name: "Calcular e revisar" }).click();
  await page.getByRole("button", { name: "Área mínima", exact: true }).click();
  await expect(page.getByText(/Área CAP-001 de .* m² aplicada ao Programa de Necessidades/)).toBeVisible();
});

test("creates five intervention environments without a persisted empty placeholder", async ({ page }) => {
  await page.getByRole("button", { name: "CAP-001" }).click();
  await page.getByRole("tab", { name: "Calculadora", exact: true }).click();
  const environment = page.getByRole("combobox", { name: "Ambiente", exact: true });
  const report = page.getByLabel("Relatório acumulado do Programa de Necessidades");

  await environment.selectOption("AMB-011");
  await page.locator("details").filter({ hasText: /^Ilhas/ }).locator("summary").click();
  await page.locator("details").filter({ hasText: /^Fornos/ }).locator("summary").click();
  await page.getByRole("checkbox", { name: /Ilha Gourmet com Cooktop e Pia/ }).check();
  await page.getByRole("checkbox", { name: /Forno de Pizza a Lenha/ }).check();
  await expect(page.getByRole("checkbox", { name: /Churrasqueira em Alvenaria/ })).toBeChecked();

  for (const [index, environmentId] of ["AMB-011", "AMB-015", "AMB-007", "AMB-018", "AMB-009"].entries()) {
    if (index > 0) await environment.selectOption(environmentId);
    await page.getByRole("button", { name: "Calcular, registrar e próximo ambiente" }).click();
    await expect(page.getByRole("status")).toHaveCount(1);
    await page.getByRole("button", { name: "Fechar aviso" }).click();
  }

  await expect(report.getByText("5 de 5 ambiente(s) calculado(s)")).toBeVisible();
  await expect(report.locator("article")).toHaveCount(5);
  for (const label of ["Varanda Gourmet / Churrasqueira", "Piscina — Espelho d’água", "Banheiro Completo / Suíte", "Despensa", "Área de Serviço / Lavanderia"]) {
    await expect(report.locator("article").filter({ hasText: label })).toHaveCount(1);
  }
  await expect(report).not.toContainText("Próximo ambiente");
  await expect(report).not.toContainText("Ambiente ainda não configurado");

  await page.reload();
  await page.getByRole("button", { name: "CAP-001" }).click();
  await page.getByRole("tab", { name: "Calculadora", exact: true }).click();
  await expect(report.getByText("5 de 5 ambiente(s) calculado(s)")).toBeVisible();
  await expect(report.locator("article")).toHaveCount(5);
  await report.locator("article").filter({ hasText: "Despensa" }).getByRole("button", { name: "Editar" }).click();
  await expect(page.getByLabel("Ambiente que será calculado").locator("option:checked")).toHaveText("Editar: Despensa");
  await expect(environment.locator("option:checked")).toHaveText("Despensa");
});

test("CAP accepts 0,60 x 1,60 and stays usable across desktop, zoom equivalents, tablet and mobile", async ({ page }) => {
  await page.getByRole("button", { name: "CAP-001" }).click();
  await page.getByRole("tab", { name: "Calculadora", exact: true }).click();
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
  await page.getByRole("tab", { name: "Estudos do projeto" }).click();
  await expect(page.getByRole("tab", { name: "Estudos do projeto" })).toHaveAttribute("aria-selected", "true");
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
    await page.getByRole("button", { name: "Voltar ao CMP" }).click();
  }
});

test("HON-002A: calcula a partir da barra persistente, resultado explícito com foco automático, atalhos, cenários, pagamentos, histórico e persistência", async ({ page }) => {
  await page.getByRole("button", { name: "HON-001" }).click();
  await expect(page.getByRole("heading", { name: "Calculadora de Honorários" })).toBeVisible();
  await page.getByRole("button", { name: "Criar estudo e importar escopo" }).click();
  await expect(page.getByRole("heading", { name: "Serviços e estimativa manual de horas" })).toBeVisible();

  // 1) "Calcular honorários" já está visível na barra persistente sem precisar abrir Resultado.
  await expect(page.getByRole("tab", { name: "Resultado" })).toHaveAttribute("aria-selected", "false");
  await expect(page.getByRole("button", { name: "Calcular honorários" })).toBeVisible();
  await expect(page.getByText("Resultado não calculado")).toBeVisible();

  await page.getByLabel(/Horas de Levantamento cadastral/).fill("40");
  await page.getByRole("tab", { name: "Parceiros" }).click();
  await expect(page.getByRole("tab", { name: "Parceiros" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "+ Parceiro" }).click();
  await page.getByLabel("Parceiro", { exact: true }).fill("Engenharia estrutural");
  await page.getByLabel("Serviço", { exact: true }).fill("Projeto estrutural");
  await page.getByLabel("Custo", { exact: true }).fill("2.000,00");
  await page.getByRole("tab", { name: "Deslocamentos e visitas" }).click();
  await page.getByRole("button", { name: "+ Deslocamento/visita" }).click();
  await page.getByLabel("Cidade", { exact: true }).fill("Vilhena");
  await page.getByLabel("Km ida e volta").fill("450");
  await page.getByLabel("Horas de viagem").fill("8");

  // 2) cálculo disparado a partir de outra aba (ainda em "Deslocamentos e visitas").
  await expect(page.getByRole("tab", { name: "Deslocamentos e visitas" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Calcular honorários" }).click();

  // 3) mudança automática para a aba Resultado.
  await expect(page.getByRole("tab", { name: "Resultado" })).toHaveAttribute("aria-selected", "true");
  // 4) foco programático no heading do resumo executivo.
  await expect(page.getByRole("heading", { name: "Resumo executivo" })).toBeFocused();
  // 5) valor final negociado visível.
  await expect(page.getByText("E. Valor final negociado")).toBeVisible();
  await expect(page.getByText(/Honorários calculados\. Valor final negociado/)).toBeVisible();
  await expect(page.getByText("Resultado atualizado")).toBeVisible();
  await expect(page.getByText("Salvo", { exact: true })).toBeVisible();

  // 6) composição do valor organizada e visível (sem precisar expandir nada).
  await expect(page.getByRole("heading", { name: "Composição do valor" })).toBeVisible();
  await expect(page.getByText("Mão de obra interna")).toBeVisible();
  // 7) "Gestão de parceiros" preservado.
  await expect(page.getByText("Gestão de parceiros")).toBeVisible();
  // 8) serviços incluídos aparecem no escopo considerado.
  await expect(page.getByRole("heading", { name: "Escopo considerado" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Levantamento cadastral" })).toBeVisible();

  // 9) atalho "Ver serviços e horas".
  await page.getByRole("button", { name: "Ver serviços e horas" }).click();
  await expect(page.getByRole("tab", { name: "Serviços e horas" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Resultado" }).click();

  // 10) atalho "Comparar cenários".
  await page.getByRole("button", { name: "Comparar cenários" }).click();
  await expect(page.getByRole("tab", { name: "Cenários" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Salvar cenário atual" }).click();
  await page.getByRole("button", { name: "Salvar cenário atual" }).click();
  await expect(page.locator(".hon-scenario-grid article")).toHaveCount(2);
  await page.getByRole("tab", { name: "Resultado" }).click();

  // 11) atalho "Configurar pagamentos" (na barra de ações do resultado — a mesma ação também
  // aparece no EmptyState de "Condições comerciais" enquanto não há plano cadastrado).
  await page.locator(".hon-actions").getByRole("button", { name: "Configurar pagamentos" }).click();
  await expect(page.getByRole("tab", { name: "Pagamentos" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "30% + etapas" }).click();
  await expect(page.getByRole("cell", { name: "30%" }).first()).toBeVisible();

  await page.getByRole("tab", { name: "Histórico e snapshots" }).click();
  await page.getByRole("button", { name: "Aprovar snapshot imutável" }).click();
  await expect(page.getByText("Snapshot imutável aprovado.")).toBeVisible();
  await expect(page.getByText("approved", { exact: true })).toBeVisible();

  // 15) reload mantém o resultado salvo.
  await page.reload();
  await page.getByRole("button", { name: "HON-001" }).click();
  await expect(page.getByRole("heading", { name: "Calculadora de Honorários" })).toBeVisible();
  await page.getByRole("tab", { name: "Histórico e snapshots" }).click();
  await expect(page.getByRole("tab", { name: "Histórico e snapshots" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("approved", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Resultado" }).click();
  await expect(page.getByText("E. Valor final negociado")).toBeVisible();
  await expect(page.getByText("Resultado atualizado")).toBeVisible();

  // 16) exportação comercial (JSON) continua funcionando.
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar comercial" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/resumo-cliente\.json$/);

  // 17) mobile sem overflow horizontal.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText("E. Valor final negociado")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);

  // 18) aproximação de zoom 200% (viewport reduzido para metade de 1280x720), sem overflow.
  await page.setViewportSize({ width: 640, height: 360 });
  await expect(page.getByText("E. Valor final negociado")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});

test("HON-002A: resultado fica desatualizado após alterar entrada relevante, e salvar não recalcula", async ({ page }) => {
  await page.getByRole("button", { name: "HON-001" }).click();
  await page.getByRole("button", { name: "Criar estudo e importar escopo" }).click();
  await page.getByLabel(/Horas de Levantamento cadastral/).fill("40");
  await page.getByRole("button", { name: "Calcular honorários" }).click();
  await expect(page.getByRole("tab", { name: "Resultado" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Resultado atualizado")).toBeVisible();
  const finalValueRow = page.locator(".hon-price-ladder div", { hasText: "E. Valor final negociado" });
  const finalValueBefore = await finalValueRow.locator("strong").textContent();

  // 12) altera uma entrada relevante para o cálculo (horas) sem recalcular.
  await page.getByRole("button", { name: "Ver serviços e horas" }).click();
  await page.getByLabel(/Horas de Levantamento cadastral/).fill("80");
  await page.getByRole("tab", { name: "Resultado" }).click();
  await expect(page.getByText("Resultado desatualizado")).toBeVisible();

  // 13) salvar não recalcula: o valor final exibido permanece o mesmo do último cálculo.
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Salvo", { exact: true })).toBeVisible();
  await expect(page.getByText("Resultado desatualizado")).toBeVisible();
  const finalValueAfterSave = await finalValueRow.locator("strong").textContent();
  expect(finalValueAfterSave).toBe(finalValueBefore);
});

test("HON-002A: erro de cálculo mantém a aba pertinente, preserva a edição e informa o problema de forma acessível", async ({ page }) => {
  await page.getByRole("button", { name: "HON-001" }).click();
  await page.getByRole("button", { name: "Criar estudo e importar escopo" }).click();
  await page.getByLabel(/Horas de Levantamento cadastral/).fill("40");
  await page.getByRole("tab", { name: "Resultado" }).click();
  await page.getByLabel("Imposto (%)").fill("150");

  // 14) erro de cálculo (imposto fora da faixa aceita pelo motor) produz mensagem acessível.
  await page.getByRole("button", { name: "Calcular honorários" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /imposto/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Resultado" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Imposto (%)")).toHaveValue("150");
  await expect(page.getByText("Resultado não calculado")).toBeVisible();
});

test("HON-002A: salvar sem alterar entradas mantém o resultado atualizado", async ({ page }) => {
  await page.getByRole("button", { name: "HON-001" }).click();
  await page.getByRole("button", { name: "Criar estudo e importar escopo" }).click();
  await page.getByLabel(/Horas de Levantamento cadastral/).fill("40");
  await page.getByRole("button", { name: "Calcular honorários" }).click();
  await expect(page.getByText("Resultado atualizado")).toBeVisible();

  // Editar um campo de observação (visual/textual, não usado pelo motor) não deve desatualizar.
  // O status fica na barra persistente, visível em qualquer aba — não precisa voltar a Resultado.
  await page.getByRole("button", { name: "Ver serviços e horas" }).click();
  await page.getByLabel(/Observações de Levantamento cadastral/).fill("revisar com o cliente");
  await expect(page.getByText("Alterações não salvas")).toBeVisible();
  await expect(page.getByText("Resultado atualizado")).toBeVisible();

  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Salvo", { exact: true })).toBeVisible();
  await expect(page.getByText("Resultado atualizado")).toBeVisible();
});

test("HON-002A: trocar de estudo reinicializa salvamento e resultado sem herdar do estudo anterior", async ({ page }) => {
  await page.getByRole("button", { name: "HON-001" }).click();
  const studySelect = page.getByLabel("Estudo HON-001");

  // Estudo A: calculado.
  await page.getByRole("button", { name: "Criar estudo e importar escopo" }).click();
  await page.getByLabel(/Horas de Levantamento cadastral/).fill("40");
  await page.getByRole("button", { name: "Calcular honorários" }).click();
  await expect(page.getByText("Resultado atualizado")).toBeVisible();
  await page.getByRole("tab", { name: "Visão geral" }).click();
  const studyAId = await studySelect.inputValue();

  // Estudo B: novo estudo do mesmo projeto, ainda sem cálculo.
  await studySelect.selectOption({ label: "Novo estudo" });
  await page.getByRole("button", { name: "Criar estudo e importar escopo" }).click();
  await expect(page.getByText("Resultado não calculado")).toBeVisible();
  await expect(page.getByText("Salvo", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Visão geral" }).click();
  const studyBId = await studySelect.inputValue();
  expect(studyBId).not.toBe(studyAId);

  // Volta ao estudo A pelo seletor: deve mostrar o status do estudo A, não o do B.
  await studySelect.selectOption({ value: studyAId });
  await expect(page.getByText("Resultado atualizado")).toBeVisible();
  await expect(page.getByText("Salvo", { exact: true })).toBeVisible();

  // E voltando para o estudo B, o status volta a ser o dele — nenhum dos dois vaza no outro.
  await studySelect.selectOption({ value: studyBId });
  await expect(page.getByText("Resultado não calculado")).toBeVisible();
});

test("HON-002A: edições repetidas não causam loop de renderização nem erros no console", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

  await page.getByRole("button", { name: "HON-001" }).click();
  await page.getByRole("button", { name: "Criar estudo e importar escopo" }).click();
  const hoursField = page.getByLabel(/Horas de Levantamento cadastral/);
  for (let i = 1; i <= 15; i += 1) {
    await hoursField.fill(String(i));
  }
  await expect(hoursField).toHaveValue("15");
  await expect(page.getByText("Alterações não salvas")).toBeVisible();
  expect(consoleErrors, `esperava nenhum erro de console; obteve: ${consoleErrors.join(" | ")}`).toHaveLength(0);
});

test("HON-002B: catálogo de serviços — categoria, busca, detalhe do serviço, foco e persistência", async ({ page }) => {
  await page.getByRole("button", { name: "HON-001" }).click();
  await page.getByRole("button", { name: "Criar estudo e importar escopo" }).click();
  await expect(page.getByRole("heading", { name: "Serviços e estimativa manual de horas" })).toBeVisible();

  // 1-4) catálogo aberto por padrão na aba Serviços e horas, com categoria e descrição curta visíveis.
  await expect(page.getByRole("heading", { name: "Catálogo de serviços" })).toBeVisible();
  const cadastralCard = page.locator(".hon-catalog-card").filter({ hasText: "Levantamento cadastral" });
  await expect(cadastralCard).toBeVisible();
  await expect(cadastralCard.getByText("Diagnóstico e levantamento")).toBeVisible();
  await expect(cadastralCard.getByText(/Medimos o imóvel como ele está hoje/)).toBeVisible();

  // 5-9) "Entenda este serviço" mostra descrição comercial, técnica, entregáveis, exclusões e premissas.
  const trigger = cadastralCard.getByRole("button", { name: "Entenda este serviço" });
  await trigger.click();
  const modal = page.getByRole("dialog", { name: "Levantamento cadastral" });
  await expect(modal).toBeVisible();
  await expect(modal.getByText(/Medimos o imóvel como ele está hoje/)).toBeVisible();
  await expect(modal.getByRole("heading", { name: "Descrição técnica" })).toBeVisible();
  await expect(modal.getByText(/Levantamento planialtimétrico e cadastral/)).toBeVisible();
  await expect(modal.getByRole("heading", { name: "Entregáveis" })).toBeVisible();
  await expect(modal.getByText("Planta de levantamento cadastral")).toBeVisible();
  await expect(modal.getByRole("heading", { name: "Não inclui" })).toBeVisible();
  await expect(modal.getByText("Sondagem de solo")).toBeVisible();
  await expect(modal.getByRole("heading", { name: "Premissas" })).toBeVisible();
  await expect(modal.getByText("Acesso completo ao imóvel para medição")).toBeVisible();

  // 10) fechar por Escape restaura o foco no botão que abriu o modal.
  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();
  await expect(trigger).toBeFocused();

  // 11) busca por nome/descrição/categoria.
  await page.getByLabel("Buscar serviço").fill("drone");
  await expect(page.getByText("Nenhum serviço encontrado")).toBeVisible();
  await page.getByLabel("Buscar serviço").fill("cadastral");
  await expect(page.locator(".hon-catalog-card")).toHaveCount(1);
  await page.getByLabel("Buscar serviço").fill("");

  // 11) filtro por categoria.
  await page.getByLabel("Categoria").selectOption({ label: "BIM e coordenação" });
  const bimCards = page.locator(".hon-catalog-card");
  await expect(bimCards).toHaveCount(4);
  await expect(bimCards.first()).toContainText("BIM e coordenação");
  await page.getByLabel("Categoria").selectOption({ label: "Todas" });

  // 13-14) reload mantém o catálogo com descrições e o estudo existente continua abrindo.
  await page.reload();
  await page.getByRole("button", { name: "HON-001" }).click();
  await page.getByRole("tab", { name: "Serviços e horas" }).click();
  await expect(page.getByRole("heading", { name: "Catálogo de serviços" })).toBeVisible();
  const cadastralCardAfterReload = page.locator(".hon-catalog-card").filter({ hasText: "Levantamento cadastral" });
  await expect(cadastralCardAfterReload.getByText(/Medimos o imóvel como ele está hoje/)).toBeVisible();
});

test("HON-002B: catálogo de serviços sem overflow horizontal em mobile", async ({ page }) => {
  await page.getByRole("button", { name: "HON-001" }).click();
  await page.getByRole("button", { name: "Criar estudo e importar escopo" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Catálogo de serviços" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
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
