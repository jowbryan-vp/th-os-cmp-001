import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import { IndexedDbProjectRepository } from "../../src/data/indexed-db-project-repository";
import { resetDatabaseConnectionForTests } from "../../src/data/th-os-database";
import { createEmptyProject } from "../../src/domain/project-master-record";
import {
  FeeStudyRepository, ServiceCatalogRepository, StructureProfileRepository,
} from "../../src/features/hon/repositories/hon-repositories";
import { calculateAndVersionStudy, createFeeStudy } from "../../src/features/hon/services/hon-study-service";

async function seed() {
  await new Promise<void>((resolve) => { const request = indexedDB.deleteDatabase("th-os"); request.onsuccess = () => resolve(); });
  resetDatabaseConnectionForTests();
  const projects = new IndexedDbProjectRepository();
  const project = createEmptyProject("TH-2040-002");
  project.internalName = "Projeto HON-002A integração";
  project.preliminaryScope = [{ id: "scope-architecture", category: "design", serviceCode: "architectural_design", name: "Projeto arquitetônico", status: "required", executionMode: "internal", responsible: "", notes: "", order: 0 }];
  await projects.save(project);
  const profileRepo = new StructureProfileRepository();
  const catalogRepo = new ServiceCatalogRepository();
  const profiles = await profileRepo.ensureDefaults();
  const catalog = await catalogRepo.ensureDefaults();
  return { project, profiles, catalog };
}

test("HON-002A: calcular estudo, salvar resultado e reabrir preservam FeeCalculationResult sem alterar dados de domínio", async () => {
  const { project, profiles, catalog } = await seed();
  const studyRepo = new FeeStudyRepository();
  const study = createFeeStudy(project, [], profiles[0], catalog, 1);
  study.services[0].estimatedHours = 30;
  const servicesBefore = structuredClone(study.services);
  const partnersBefore = structuredClone(study.partners);

  const calculated = calculateAndVersionStudy(study, profiles[0]);
  assert.ok(calculated.results, "o cálculo deve produzir um FeeCalculationResult");
  assert.equal(calculated.status, "calculated");

  const saved = await studyRepo.save(calculated);
  assert.deepEqual(saved.results, calculated.results, "o resultado salvo deve ser idêntico ao calculado");

  // Simula reabertura do estudo (nova leitura via repositório, como acontece após reload).
  const reopened = await studyRepo.get(saved.id);
  assert.ok(reopened);
  assert.deepEqual(reopened!.results, calculated.results, "reabrir o estudo deve preservar o FeeCalculationResult");
  assert.deepEqual(reopened!.services, servicesBefore, "os serviços do escopo não devem ser alterados pelo fluxo de cálculo/salvamento");
  assert.deepEqual(reopened!.partners, partnersBefore, "parceiros não relacionados ao cálculo não devem ser alterados");
});

test("HON-002A: salvar o estudo não recalcula automaticamente o resultado", async () => {
  const { project, profiles, catalog } = await seed();
  const studyRepo = new FeeStudyRepository();
  const study = createFeeStudy(project, [], profiles[0], catalog, 1);
  study.services[0].estimatedHours = 30;
  const calculated = calculateAndVersionStudy(study, profiles[0]);
  await studyRepo.save(calculated);

  // Altera uma entrada relevante para o cálculo (horas) sem recalcular e salva o estudo como está.
  const editedWithoutRecalc = { ...calculated, services: calculated.services.map((s, i) => i === 0 ? { ...s, estimatedHours: 999 } : s) };
  const savedWithoutRecalc = await studyRepo.save(editedWithoutRecalc);

  assert.deepEqual(savedWithoutRecalc.results, calculated.results, "salvar não deve recalcular: o resultado persistido deve permanecer o da última chamada explícita ao motor");
  assert.equal(savedWithoutRecalc.services[0].estimatedHours, 999, "a edição não calculada deve, ainda assim, ser persistida");
});
