import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { pilotProject } from "../../src/domain/project-master-record";
import { capLibrary } from "../../src/features/cap/services/cap-library-service";
import { applyScenarioToNeedsProgram } from "../../src/features/cap/services/cap-program-service";
import { calculateScenario, createParametricStudy, createSelectedLibraryItem } from "../../src/features/cap/services/cap-scenario-service";

const root = process.cwd();
const hash = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");
const generatedDir = path.join(root, "src/features/cap/data/v1.1.0");

test("preserves the approved raw hash and exposes a valid versioned library", () => {
  const raw = path.join(root, "data/cap-001/raw/CAP-001_Biblioteca_Parametrica_v1.1.0.json");
  assert.equal(hash(raw), "8449321c330345221cf3136cdd7f5e6b2becf88f35215240ff921dcab8319ac2");
  assert.equal(capLibrary.metadata.version, "1.1.0");
  assert.equal(capLibrary.metadata.sourceHash, hash(raw));
  assert.equal(capLibrary.environments.length, 14);
  assert.equal(new Set(capLibrary.environments.map((item) => item.id)).size, 14);
  assert.equal(capLibrary.environments.filter((item) => item.capability === "full_calculator").length, 8);
  assert.equal(capLibrary.environments.filter((item) => item.capability === "preliminary_calculator").length, 5);
  assert.equal(capLibrary.environments.filter((item) => item.capability === "experimental").length, 1);
});

test("keeps references, inferred data and conflicts traceable", () => {
  const sourceIds = new Set(capLibrary.sources.map((item) => item.id));
  for (const item of [...capLibrary.furniture, ...capLibrary.equipment]) {
    assert.ok(sourceIds.has(item.sourceId)); assert.ok(item.page > 0);
  }
  const itemIds = new Set([...capLibrary.furniture, ...capLibrary.equipment].map((item) => item.id));
  for (const composition of capLibrary.compositions) for (const itemId of composition.itemIds) assert.ok(itemIds.has(itemId));
  assert.ok([...capLibrary.furniture, ...capLibrary.equipment].some((item) => item.inferred));
  assert.ok(capLibrary.conflicts.length > 0 && capLibrary.conflicts.every((item) => item.preserved));
  assert.ok(capLibrary.warnings.some((item) => item.normativeReferenceRequiresReview));
});

test("normalization is reproducible and generates every expected artifact", () => {
  const run = () => execFileSync(process.execPath, ["--import", "tsx", "scripts/cap/normalize.ts"], { cwd: root, stdio: "pipe" });
  run();
  const names = readdirSync(generatedDir).filter((name) => name.endsWith(".json")).sort();
  const first = Object.fromEntries(names.map((name) => [name, hash(path.join(generatedDir, name))]));
  run();
  const second = Object.fromEntries(names.map((name) => [name, hash(path.join(generatedDir, name))]));
  assert.deepEqual(second, first);
  assert.deepEqual(names, ["accessibility-profiles.json", "audit-report.json", "calculation-rules.json", "circulation-profiles.json",
    "comfort-levels.json", "compositions.json", "conflicts.json", "environments.json", "equipment.json", "functional-zones.json",
    "furniture.json", "metadata.json", "sources.json", "warnings.json"]);
});

test("applies a calculated scenario with complete CAP traceability", () => {
  const need = { id: "need-cap-test", environment: "Suíte", sector: "Íntimo", floor: "Térreo", currentSituation: "under_review" as const,
    intervention: "study" as const, existingAreaM2: null, desiredAreaM2: null, quantity: 1, priority: "important" as const,
    users: "", needs: "", lighting: "", ventilation: "", privacy: "", accessibility: "", furniture: "", equipment: "",
    connections: "", notes: "", order: 0, parametricStudyId: null, parametricScenarioId: null, appliedAreaType: null,
    appliedAreaM2: null, capLibraryVersion: null, calculationEngineVersion: null, calculatedAt: null };
  const project = { ...pilotProject, needsProgram: [need] };
  const at = "2026-08-03T15:00:00.000Z";
  const study = createParametricStudy(project.id, "AMB-001", need.id, at);
  const calculated = calculateScenario({ ...study.scenarios[0]!, selectedItems: [createSelectedLibraryItem("MOB-001", "furniture")] }, at);
  const updated = applyScenarioToNeedsProgram(project, study, calculated, "recommended", at);
  const applied = updated.needsProgram.find((item) => item.id === need.id)!;
  assert.equal(applied.desiredAreaM2, calculated.result!.recommendedNetAreaM2);
  assert.deepEqual([applied.parametricStudyId, applied.parametricScenarioId, applied.appliedAreaType,
    applied.capLibraryVersion, applied.calculationEngineVersion, applied.calculatedAt],
  [study.id, calculated.id, "recommended", "1.1.0", study.engineVersion, at]);
  assert.equal(updated.history.at(-1)?.action, "cap_area_applied");
});
