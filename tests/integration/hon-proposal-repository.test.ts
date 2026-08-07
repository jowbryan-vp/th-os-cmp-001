import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import { IndexedDbProjectRepository } from "../../src/data/indexed-db-project-repository";
import { resetDatabaseConnectionForTests } from "../../src/data/th-os-database";
import { createEmptyProject } from "../../src/domain/project-master-record";
import {
  FeeStudyRepository, ProposalDraftRepository, ServiceCatalogRepository, StructureProfileRepository, readHonBackupData,
} from "../../src/features/hon/repositories/hon-repositories";
import { incorporateStudyIntoProposal, nextProposalCode } from "../../src/features/hon/services/hon-proposal-service";
import { calculateAndVersionStudy, createFeeStudy } from "../../src/features/hon/services/hon-study-service";

async function resetDb() {
  await new Promise<void>((resolve) => { const request = indexedDB.deleteDatabase("th-os"); request.onsuccess = () => resolve(); });
  resetDatabaseConnectionForTests();
}

test("ProposalDraftRepository persiste, encontra por studyId (idempotência) e sobrevive a reload", async () => {
  await resetDb();
  const projects = new IndexedDbProjectRepository(); const project = createEmptyProject("TH-2041-001");
  project.internalName = "Projeto proposta"; project.preliminaryScope = [{ id: "scope-architecture", category: "design", serviceCode: "architectural_design", name: "Projeto arquitetônico", status: "required", executionMode: "internal", responsible: "", notes: "", order: 0 }];
  await projects.save(project);
  const profiles = new StructureProfileRepository(); const catalog = new ServiceCatalogRepository();
  const seededProfiles = await profiles.ensureDefaults(); const seededCatalog = await catalog.ensureDefaults();
  const studies = new FeeStudyRepository();
  let study = createFeeStudy(project, [], seededProfiles[0], seededCatalog, 1);
  study.services[0].estimatedHours = 20; study = calculateAndVersionStudy(study, seededProfiles[0]); await studies.save(study);

  const proposals = new ProposalDraftRepository();
  assert.equal(await proposals.findByStudyId(study.id), undefined, "nenhuma proposta ainda existe para o estudo");
  const code = nextProposalCode(await proposals.list());
  const first = incorporateStudyIntoProposal(study, seededCatalog, 0, null, code);
  await proposals.save(first);

  // "Incorporar à proposta" repetido para o MESMO estudo deve atualizar, nunca duplicar
  // (idempotência aplicada na camada de aplicação — HON-003).
  const existing = await proposals.findByStudyId(study.id);
  assert.ok(existing);
  const updated = incorporateStudyIntoProposal(study, seededCatalog, 0, existing!, existing!.code);
  await proposals.save(updated);
  assert.equal((await proposals.listByProject(project.id)).length, 1, "incorporar de novo atualiza a mesma proposta, não cria uma segunda");

  resetDatabaseConnectionForTests();
  const reread = await new ProposalDraftRepository().findByStudyId(study.id);
  assert.equal(reread?.code, code);
  assert.equal(reread?.title, first.title, "campos manuais sobrevivem ao reload");
});

test("backup consolidado inclui propostas e restaura atomicamente; rejeita proposta sem estudo correspondente ou duplicada por estudo", async () => {
  await resetDb();
  const projects = new IndexedDbProjectRepository(); const project = createEmptyProject("TH-2042-001");
  project.internalName = "Projeto backup proposta"; await projects.save(project);
  const profiles = new StructureProfileRepository(); const catalog = new ServiceCatalogRepository();
  const seededProfiles = await profiles.ensureDefaults(); const seededCatalog = await catalog.ensureDefaults();
  const studies = new FeeStudyRepository();
  let study = createFeeStudy(project, [], seededProfiles[0], seededCatalog, 1);
  study = calculateAndVersionStudy(study, seededProfiles[0]); await studies.save(study);
  const proposals = new ProposalDraftRepository();
  const draft = incorporateStudyIntoProposal(study, seededCatalog, 0, null, nextProposalCode([]));
  await proposals.save(draft);

  const backup = await readHonBackupData();
  assert.equal(backup.proposalDrafts.length, 1);
  const restored = await projects.restoreAll([project], [], [], backup);
  assert.equal(restored.hon.proposalDrafts.length, 1);
  assert.equal((await proposals.list()).length, 1);

  const orphanBackup = { ...backup, proposalDrafts: [{ ...draft, studyId: "study-inexistente" }] };
  await assert.rejects(() => projects.restoreAll([project], [], [], orphanBackup), /proposta sem estudo ou projeto/);

  const duplicateBackup = { ...backup, proposalDrafts: [draft, { ...draft, id: "outra-proposta" }] };
  await assert.rejects(() => projects.restoreAll([project], [], [], duplicateBackup), /mais de uma proposta para o mesmo estudo/);
});
