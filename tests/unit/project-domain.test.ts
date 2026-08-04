import assert from "node:assert/strict";
import test from "node:test";
import {
  PROJECT_SCHEMA_VERSION, createEmptyProject, createHistoryEvent, pilotProject,
  projectPhases,
} from "../../src/domain/project-master-record";
import { migrateProject } from "../../src/domain/project-migrations";
import { calculateOverallProgress, calculateSectionProgress, overduePending, summarizeAreas } from "../../src/domain/project-progress";
import { calculateReadiness } from "../../src/domain/project-validation";
import {
  detectImportConflict, exportConsolidatedBackup, exportProject, parseConsolidatedBackup,
} from "../../src/services/project-import-service";

test("creates a v2 project with an enum phase and history", () => {
  const project = createEmptyProject("TH-2026-002", "2026-01-01T00:00:00.000Z");
  assert.equal(project.schemaVersion, PROJECT_SCHEMA_VERSION);
  assert.ok(projectPhases.includes(project.projectPhase));
  assert.equal(project.history[0]?.action, "created");
});
test("uses the correct Cacoal pilot without invented personal data", () => {
  assert.equal(pilotProject.property.city, "Cacoal");
  assert.equal(pilotProject.property.state, "RO");
  assert.equal(pilotProject.clients[0]?.name, "");
  assert.match(pilotProject.internalName, /Reforma e Ampliação/);
  assert.equal(pilotProject.preliminaryScope.filter((item) => item.status === "required").length, 3);
  assert.doesNotMatch(JSON.stringify(pilotProject), /Manaus|Cliente piloto|Área social integrada/);
});
test("migrates v1 preserving user data and maps old scope", () => {
  const migrated = migrateProject({
    id: "legacy-project", schemaVersion: 1, code: "TH-2025-007", title: "Legado",
    status: "active", summary: "Síntese preservada", preliminaryScope: ["renovation"],
    property: { city: "Cacoal", state: "RO", area: "123,50" },
    clients: [{ id: "legacy-client", name: "Pessoa", primary: true }],
  });
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.internalName, "Legado");
  assert.equal(migrated.property.existingBuiltAreaM2, 123.5);
  assert.equal(migrated.preliminaryScope.length, 1);
});
test("validates readiness without changing lifecycle", () => {
  const project = createEmptyProject("TH-2026-002");
  project.internalName = "Teste"; project.clients[0]!.name = "Cliente";
  project.property.city = "Cacoal"; project.initialSynthesis = "Síntese";
  const before = project.recordStatus;
  assert.equal(calculateReadiness(project, "draft").valid, true);
  assert.equal(calculateReadiness(project, "meeting").valid, false);
  assert.equal(project.recordStatus, before);
});
test("calculates weighted section and overall progress", () => {
  const empty = createEmptyProject("TH-2026-002");
  const identification = calculateSectionProgress(empty, "identification");
  assert.equal(identification.required, 3);
  assert.ok(calculateOverallProgress(pilotProject) > calculateOverallProgress(empty));
});
test("does not award record progress for having pending items", () => {
  const project = createEmptyProject("TH-2026-002");
  const before = calculateSectionProgress(project, "records").percentage;
  project.pending.push({
    id: "pending-1", description: "Bloqueio", category: "", responsible: "",
    dueDate: "2020-01-01", priority: "high", status: "blocked", dependency: "",
    affectedPhase: "pre_service", notes: "", completedAt: null,
  });
  assert.ok(calculateSectionProgress(project, "records").percentage < before);
  assert.equal(overduePending(project, new Date("2026-01-01")).length, 1);
});
test("summarizes needs areas and quantities", () => {
  const project = createEmptyProject("TH-2026-002");
  project.needsProgram.push({
    id: "need-1", environment: "Ambiente", sector: "", floor: "", currentSituation: "existing",
    intervention: "expand", existingAreaM2: 10, desiredAreaM2: 18, quantity: 2,
    priority: "essential", users: "", needs: "", lighting: "", ventilation: "", privacy: "",
    accessibility: "", furniture: "", equipment: "", connections: "", notes: "", order: 0,
    parametricStudyId: null, parametricScenarioId: null, capMinimumAreaM2: null,
    capRecommendedAreaM2: null, capPreliminaryGrossAreaM2: null, appliedAreaType: null, appliedAreaM2: null,
    capLibraryVersion: null, calculationEngineVersion: null, calculatedAt: null,
  });
  assert.deepEqual(summarizeAreas(project), {
    existing: 20, desired: 36, expansion: 16, demolition: 0,
    environments: 2, essential: 1, underReview: 0,
  });
});
test("detects import conflicts and exports a typed envelope", () => {
  const project = createEmptyProject("TH-2026-002");
  const sameCode = { ...createEmptyProject("TH-2026-002"), id: "other-id" };
  assert.equal(detectImportConflict(project, [sameCode]), "code");
  const envelope = exportProject(project);
  assert.equal(envelope.application, "TH-OS-CMP-001");
  assert.ok(envelope.exportedAt);
});
test("exports and validates a consolidated backup", () => {
  const first = createEmptyProject("TH-2026-002");
  const second = createEmptyProject("TH-2026-003");
  const backup = exportConsolidatedBackup([first, second]);
  assert.equal(backup.kind, "consolidated-backup");
  assert.equal(parseConsolidatedBackup(backup).projects.length, 2);
  assert.throws(() => parseConsolidatedBackup({ ...backup, projectRecords: [first, { ...second, code: first.code }] }),
    /ID ou código duplicado/);
  assert.throws(() => parseConsolidatedBackup({ ...backup, schemaVersion: PROJECT_SCHEMA_VERSION + 1 }),
    /versão futura/);
});
test("stores money as integer cents and creates centralized history", () => {
  const project = createEmptyProject("TH-2026-002");
  project.budget.estimatedConstructionBudgetCents = 250_000_00;
  assert.equal(Number.isInteger(project.budget.estimatedConstructionBudgetCents), true);
  assert.equal(createHistoryEvent("scope_changed", "Escopo revisto.").action, "scope_changed");
});
