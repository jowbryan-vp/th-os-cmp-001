import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import { IndexedDbProjectRepository } from "../../src/data/indexed-db-project-repository";
import {
  FEE_STUDY_STORE_NAME, openThOsDatabase, resetDatabaseConnectionForTests, transactionDone,
} from "../../src/data/th-os-database";
import { createEmptyProject } from "../../src/domain/project-master-record";
import { withCommercialState } from "../../src/features/hon/domain/hon-service-composition";
import {
  FeeStudyRepository, ServiceCatalogRepository, StructureProfileRepository, parseHonBackupData,
} from "../../src/features/hon/repositories/hon-repositories";
import { createFeeStudy } from "../../src/features/hon/services/hon-study-service";

async function resetDb() {
  await new Promise<void>((resolve) => { const request = indexedDB.deleteDatabase("th-os"); request.onsuccess = () => resolve(); });
  resetDatabaseConnectionForTests();
}

async function seed() {
  await resetDb();
  const projects = new IndexedDbProjectRepository();
  const project = createEmptyProject("TH-2040-004");
  project.internalName = "Projeto HON-002C integração";
  project.preliminaryScope = [{ id: "scope-architecture", category: "design", serviceCode: "architectural_design", name: "Projeto arquitetônico", status: "required", executionMode: "internal", responsible: "", notes: "", order: 0 }];
  await projects.save(project);
  const profileRepo = new StructureProfileRepository();
  const catalogRepo = new ServiceCatalogRepository();
  const profiles = await profileRepo.ensureDefaults();
  const catalog = await catalogRepo.ensureDefaults();
  return { project, profiles, catalog };
}

async function putLegacyStudy(record: Record<string, unknown>) {
  const db = await openThOsDatabase();
  const tx = db.transaction(FEE_STUDY_STORE_NAME, "readwrite");
  tx.objectStore(FEE_STUDY_STORE_NAME).put(record);
  await transactionDone(tx);
}

function legacyStudyRecord(overrides: Record<string, unknown> = {}) {
  const now = "2026-08-04T12:00:00.000Z";
  return {
    id: "fee-study-legacy", schemaVersion: 2, projectId: "project-legacy", code: "HON-LEGACY-01", name: "Estudo legado",
    version: 1, status: "draft", structureProfileId: "profile-current-operation", calculationMethod: "service_cost",
    projectSnapshot: { readAt: now, projectUpdatedAt: now, projectCode: "TH-LEGACY", projectName: "Legado", clientName: "", city: "Cacoal", state: "RO", propertyType: "", areas: { existing: null, expansion: null, demolition: null, capApplied: 0 }, floors: null, scopeCodes: [], capStudyIds: [], capLibraryVersions: [], manualChanges: [], divergences: [] },
    inputs: { calculationDate: "2026-08-04", complexityLevel: "simple", complexitySuggestedLevel: "simple", complexityScore: 0, complexityJustification: "", urgencyLevel: "normal", riskPercentage: 0, profitMarkup: 0, taxPercentage: 0, taxMode: "included", discountCents: 0, donationCents: 0, commercialPriceCents: null, minimumContractCents: 0, directExpensesCents: 0, areaReferenceM2: null, constructionCostReferenceCents: null, cauReferencePercentage: null, cauReferenceSource: "", commercialReferenceNotes: "" },
    // Formato anterior ao HON-002C: sem category/displayOrder/commercialState/quantity/individualDiscountCents/customDescription.
    services: [{
      id: "fee-service-legacy", catalogItemId: "service-architectural_design", code: "architectural_design",
      name: "Projeto arquitetônico", stage: "projeto", estimatedHours: 25, hourlyCostCents: null,
      fixedCostCents: 0, minimumValueCents: 0, included: true, notes: "estudo pré-HON-002C",
    }],
    partners: [], travel: [], revisions: [], risks: [],
    bim: { mode: "internal_method", percentage: 0, affectedBaseCents: 0, additionalHours: 0, nativeFile: false, ifc: false, federatedModel: false, lod: "", loi: "", disciplines: 0, cycles: 0, notes: "" },
    construction: { monitoringWeeks: 0, visitsPerWeek: 0, hoursPerVisit: 0, managementWeeklyHours: 0, managementWeeks: 0, dedicatedTeamCostCents: 0, notes: "" },
    discounts: [], donations: [], paymentPlan: null, results: null, snapshots: [],
    // compositionHistory também ausente de propósito — cobre o default do zod, não a migração manual.
    createdAt: now, updatedAt: now, approvedAt: null, notes: "",
    ...overrides,
  };
}

test("estudo antigo (sem composição HON-002C) abre normalmente via FeeStudyRepository, migrado na leitura", async () => {
  await resetDb();
  await putLegacyStudy(legacyStudyRecord());
  const study = await new FeeStudyRepository().get("fee-study-legacy");
  assert.ok(study);
  assert.equal(study!.services[0].commercialState, "included");
  assert.equal(study!.services[0].quantity, 1);
  assert.equal(study!.services[0].individualDiscountCents, 0);
  assert.equal(study!.services[0].category, "design");
  assert.equal(study!.services[0].catalogItemId, "service-architectural_design", "catalogItemId não pode quebrar na migração");
  assert.deepEqual(study!.compositionHistory, [], "compositionHistory ausente vira array vazio (default do schema)");
});

test("composição nova (estado comercial, quantidade, desconto) persiste e sobrevive a reload", async () => {
  const { project, profiles, catalog } = await seed();
  const studyRepo = new FeeStudyRepository();
  const study = createFeeStudy(project, [], profiles[0], catalog, 1);
  const composed = {
    ...study,
    services: study.services.map((service, index) => index === 0
      ? { ...withCommercialState(service, "optional"), quantity: 4, individualDiscountCents: 2_500, notes: "revisar com cliente" }
      : service),
  };
  const saved = await studyRepo.save(composed);
  assert.equal(saved.services[0].commercialState, "optional");
  assert.equal(saved.services[0].quantity, 4);
  assert.equal(saved.services[0].individualDiscountCents, 2_500);

  // "Reload": nova instância do repositório, nova leitura do IndexedDB — nada de estado em memória.
  const reread = await new FeeStudyRepository().get(saved.id);
  assert.ok(reread);
  assert.equal(reread!.services[0].commercialState, "optional");
  assert.equal(reread!.services[0].quantity, 4);
  assert.equal(reread!.services[0].individualDiscountCents, 2_500);
  assert.equal(reread!.services[0].notes, "revisar com cliente");
});

test("item personalizado editado (nome, categoria, descrições) persiste e não é sobrescrito na releitura", async () => {
  const { project, profiles, catalog } = await seed();
  const studyRepo = new FeeStudyRepository();
  const study = createFeeStudy(project, [], profiles[0], catalog, 1);
  const customService = {
    id: "fee-service-custom", catalogItemId: null, code: "custom-drone", name: "Levantamento com drone",
    stage: "levantamento", category: "diagnosis" as const, displayOrder: 150, estimatedHours: 4,
    hourlyCostCents: null, fixedCostCents: 0, minimumValueCents: 0, commercialState: "not_contracted" as const,
    included: false, optional: false, complimentary: false, quantity: 1, individualDiscountCents: 0,
    customDescription: {
      clientDescription: "Sobrevoo com drone para registro aéreo do terreno.",
      technicalDescription: "Captura de imagens aéreas com drone certificado.",
      deliverables: ["Fotos aéreas em alta resolução"], exclusions: ["Modelagem 3D"], assumptions: ["Condições climáticas favoráveis"],
    },
    notes: "",
  };
  const withCustom = { ...study, services: [...study.services, customService] };
  await studyRepo.save(withCustom);

  const reread = await new FeeStudyRepository().get(study.id);
  const rereadCustom = reread!.services.find((service) => service.id === "fee-service-custom");
  assert.ok(rereadCustom);
  assert.equal(rereadCustom!.catalogItemId, null, "item personalizado nunca ganha catalogItemId por migração/leitura");
  assert.equal(rereadCustom!.name, "Levantamento com drone");
  assert.equal(rereadCustom!.customDescription?.clientDescription, "Sobrevoo com drone para registro aéreo do terreno.");
  assert.deepEqual(rereadCustom!.customDescription?.deliverables, ["Fotos aéreas em alta resolução"]);

  // O item padrão do catálogo (architectural_design) continua com seu conteúdo curado, intocado.
  const standardService = reread!.services.find((service) => service.catalogItemId !== null);
  assert.ok(standardService);
  assert.equal(standardService!.customDescription, null, "item padrão do catálogo nunca ganha customDescription");
});

test("backup/restore honSchemaVersion 2 (pré-HON-002C): estudo com serviço no formato antigo é migrado ao restaurar", async () => {
  await resetDb();
  const legacy = legacyStudyRecord({ projectId: "project-restore" });
  const projectIds = new Set(["project-restore"]);
  const parsed = parseHonBackupData({
    feeStudies: [legacy as never], feeScenarios: [], structureProfiles: [], feeSnapshots: [], paymentPlans: [],
    feeCalibrationRecords: [], serviceCatalog: [],
  }, projectIds);
  assert.equal(parsed.feeStudies.length, 1);
  const [study] = parsed.feeStudies;
  assert.equal(study.services[0].commercialState, "included");
  assert.equal(study.services[0].quantity, 1);
  assert.equal(study.services[0].catalogItemId, "service-architectural_design");
  assert.deepEqual(study.compositionHistory, []);
});
