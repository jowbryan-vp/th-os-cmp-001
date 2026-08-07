import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import { SERVICE_CATALOG_STORE_NAME, openThOsDatabase, resetDatabaseConnectionForTests, transactionDone } from "../../src/data/th-os-database";
import { createEmptyProject } from "../../src/domain/project-master-record";
import { ServiceCatalogRepository, parseHonBackupData } from "../../src/features/hon/repositories/hon-repositories";
import { createFeeStudy } from "../../src/features/hon/services/hon-study-service";
import { defaultStructureProfiles } from "../../src/features/hon/services/hon-presets";

async function resetDb() {
  await new Promise<void>((resolve) => { const request = indexedDB.deleteDatabase("th-os"); request.onsuccess = () => resolve(); });
  resetDatabaseConnectionForTests();
}

// Grava um registro diretamente no object store, no formato anterior ao HON-002B — simula uma
// instalação que já tinha o catálogo salvo antes desta migração existir, ignorando o schema
// (que hoje já exige os campos novos) de propósito.
async function putLegacyRecord(record: Record<string, unknown>) {
  const db = await openThOsDatabase();
  const tx = db.transaction(SERVICE_CATALOG_STORE_NAME, "readwrite");
  tx.objectStore(SERVICE_CATALOG_STORE_NAME).put(record);
  await transactionDone(tx);
}

function legacyCadastralSurvey() {
  return {
    id: "service-cadastral_survey", version: "1.0.0", code: "cadastral_survey", name: "Levantamento cadastral", stage: "levantamento",
    calculationMethod: "hours", baseHours: 12, minimumHours: 0, unit: "hora", responsible: "Arquiteto responsável",
    execution: "internal", defaultComplexity: "simple", includedRevisionRounds: 0, includedVisits: 0,
    bim: false, risk: "low", minimumValueCents: 0, active: true,
    source: "Preset inicial HON-001", confidence: "unvalidated", notes: "Calibrado no projeto TH-2026-001.",
  };
}

test("banco com catálogo antigo: leitura via ServiceCatalogRepository migra o registro automaticamente", async () => {
  await resetDb();
  await putLegacyRecord(legacyCadastralSurvey());
  const list = await new ServiceCatalogRepository().list();
  assert.equal(list.length, 1);
  assert.equal(list[0].category, "diagnosis");
  assert.ok(list[0].clientDescription.length > 0);
  assert.equal(list[0].baseHours, 12, "parâmetro de cálculo já calibrado não pode ser perdido na migração");
});

test("catálogo padrão atualizado: ensureDefaults numa base vazia semeia os 40 itens já com os campos novos", async () => {
  await resetDb();
  const seeded = await new ServiceCatalogRepository().ensureDefaults();
  assert.equal(seeded.length, 40);
  assert.ok(seeded.every((item) => item.clientDescription.length > 0));
});

test("item personalizado salvo antes da migração é preservado ao ser lido", async () => {
  await resetDb();
  await putLegacyRecord({
    id: "service-custom-drone", version: "1.0.0", code: "custom_survey_drone", name: "Levantamento aéreo com drone", stage: "levantamento",
    calculationMethod: "fixed", baseHours: 0, minimumHours: 0, unit: "serviço", responsible: "Parceiro", execution: "partner",
    defaultComplexity: "simple", includedRevisionRounds: 0, includedVisits: 0, bim: false, risk: "low", minimumValueCents: 50_000,
    active: true, source: "Cadastrado manualmente pelo arquiteto", confidence: "low", notes: "Fornecedor parceiro local.",
  });
  const list = await new ServiceCatalogRepository().list();
  assert.equal(list.length, 1);
  assert.equal(list[0].name, "Levantamento aéreo com drone");
  assert.equal(list[0].source, "Cadastrado manualmente pelo arquiteto");
  assert.equal(list[0].category, "complementary");
});

test("FeeServiceInput.catalogItemId continua resolvendo para o item do catálogo após a migração", async () => {
  await resetDb();
  await putLegacyRecord(legacyCadastralSurvey());
  const catalog = await new ServiceCatalogRepository().list();
  const project = createEmptyProject("TH-2040-003");
  project.internalName = "Projeto migração de catálogo";
  project.preliminaryScope = [{ id: "scope-cadastral", category: "design", serviceCode: "cadastral_survey", name: "Levantamento cadastral", status: "required", executionMode: "internal", responsible: "", notes: "", order: 0 }];
  const study = createFeeStudy(project, [], defaultStructureProfiles[0], catalog, 1);
  const service = study.services.find((item) => item.code === "cadastral_survey");
  assert.ok(service, "o serviço deve existir no estudo criado");
  assert.equal(service!.catalogItemId, "service-cadastral_survey");
  assert.equal(service!.name, "Levantamento cadastral");
});

test("restauração de backup honSchemaVersion 1: catálogo antigo no envelope é migrado ao restaurar", async () => {
  await resetDb();
  const parsed = parseHonBackupData({
    feeStudies: [], feeScenarios: [], structureProfiles: [], feeSnapshots: [], paymentPlans: [], feeCalibrationRecords: [],
    proposalDrafts: [], serviceCatalog: [legacyCadastralSurvey()],
  }, new Set());
  assert.equal(parsed.serviceCatalog.length, 1);
  assert.equal(parsed.serviceCatalog[0].category, "diagnosis");
  assert.ok(parsed.serviceCatalog[0].clientDescription.length > 0);
});

test("catálogo persistido no formato novo continua sendo lido normalmente (sem regressão)", async () => {
  await resetDb();
  const seeded = await new ServiceCatalogRepository().ensureDefaults();
  const reread = await new ServiceCatalogRepository().list();
  assert.deepEqual(reread.map((item) => item.id).sort(), seeded.map((item) => item.id).sort());
});
