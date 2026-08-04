import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import { IndexedDbProjectRepository } from "../../src/data/indexed-db-project-repository";
import { resetDatabaseConnectionForTests } from "../../src/data/th-os-database";
import { createEmptyProject } from "../../src/domain/project-master-record";
import {
  FeeScenarioRepository, FeeSnapshotRepository, FeeStudyRepository, PaymentPlanRepository,
  ServiceCatalogRepository, StructureProfileRepository, readHonBackupData,
} from "../../src/features/hon/repositories/hon-repositories";
import { createPaymentPlan } from "../../src/features/hon/services/hon-engine";
import { approveStudy, calculateAndVersionStudy, createFeeStudy, createScenario } from "../../src/features/hon/services/hon-study-service";

test("HON persiste perfis, estudo, cenário, pagamento e snapshot imutável e restaura atomicamente", async () => {
  await new Promise<void>((resolve) => { const request = indexedDB.deleteDatabase("th-os"); request.onsuccess = () => resolve(); });
  resetDatabaseConnectionForTests();
  const projects = new IndexedDbProjectRepository(); const project = createEmptyProject("TH-2040-001");
  project.internalName = "Projeto HON integração"; project.preliminaryScope = [{ id: "scope-architecture", category: "design", serviceCode: "architectural_design", name: "Projeto arquitetônico", status: "required", executionMode: "internal", responsible: "", notes: "", order: 0 }];
  await projects.save(project);
  const profiles = new StructureProfileRepository(); const catalog = new ServiceCatalogRepository();
  const seededProfiles = await profiles.ensureDefaults(); const seededCatalog = await catalog.ensureDefaults();
  assert.equal(seededProfiles.length, 2); assert.ok(seededCatalog.length >= 40);
  const studies = new FeeStudyRepository(); let study = createFeeStudy(project, [], seededProfiles[0], seededCatalog, 1);
  study.services[0].estimatedHours = 20; study = calculateAndVersionStudy(study, seededProfiles[0]); await studies.save(study);
  assert.equal((await studies.listByProject(project.id)).length, 1); assert.ok(study.results?.recommendedFee);
  const scenarios = new FeeScenarioRepository(); const scenario = createScenario(study, "Arquitetura", "30% + etapas"); await scenarios.save(scenario);
  assert.equal((await scenarios.listByStudy(study.id)).length, 1);
  const payments = new PaymentPlanRepository(); const plan = createPaymentPlan(study.id, "30% + etapas", "thirty_installments", study.results!.finalPrice, "2040-01-01");
  await payments.save(plan); assert.equal((await payments.listByStudy(study.id))[0].valid, true);
  const snapshots = new FeeSnapshotRepository(); const approved = approveStudy({ ...study, paymentPlan: plan }); await snapshots.save(approved.snapshot);
  await assert.rejects(() => snapshots.save(approved.snapshot), /imutáveis/);
  const backup = await readHonBackupData(); assert.equal(backup.feeStudies.length, 1); assert.equal(backup.feeSnapshots.length, 1);
  const restored = await projects.restoreAll([project], [], [], backup);
  assert.equal(restored.hon.feeScenarios.length, 1); assert.equal(restored.hon.paymentPlans.length, 1);
  await assert.rejects(() => projects.restoreAll([], [], [], backup), /estudo sem projeto/);
  assert.equal((await studies.listByProject(project.id)).length, 1, "falha de validação não deve restaurar parcialmente");
});
