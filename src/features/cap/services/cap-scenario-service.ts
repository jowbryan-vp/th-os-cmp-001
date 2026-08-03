import { createId } from "../../../domain/project-master-record";
import { ParametricEnvironmentStudy, ParametricScenario, SelectedItem } from "../domain/cap-library-types";
import { CAP_ENGINE_VERSION, calculateParametricScenario } from "./cap-calculation-engine";
import { capLibrary } from "./cap-library-service";

export function createSelectedLibraryItem(libraryItemId: string, sourceType: "furniture" | "equipment", quantity = 1): SelectedItem {
  return { id: createId("cap-item"), sourceType, libraryItemId, quantity, dimensionsMode: "library",
    customWidthM: null, customLengthM: null, customHeightM: null, functionalRole: "primary",
    circulationProfileId: "CIR-002", notes: "" };
}
export function createParametricScenario(environmentId: string, name = "Cenário inicial", now = new Date().toISOString()): ParametricScenario {
  return { id: createId("cap-scenario"), name, environmentId, comfortLevel: "comfortable", accessibilityProfile: "standard",
    selectedItems: [], arrangement: "", customParameters: {}, geometricReservePercentage: 15, result: null,
    createdAt: now, updatedAt: now, notes: "" };
}
export function calculateScenario(scenario: ParametricScenario, now = new Date().toISOString()): ParametricScenario {
  return { ...scenario, result: calculateParametricScenario(scenario, now), updatedAt: now };
}
export function createParametricStudy(projectId: string, environmentId: string, needsProgramItemId: string | null,
  now = new Date().toISOString()): ParametricEnvironmentStudy {
  const scenario = createParametricScenario(environmentId, "Cenário A", now);
  return { id: createId("cap-study"), projectId, needsProgramItemId, name: "Estudo paramétrico",
    environmentId, libraryCode: "CAP-001", libraryVersion: capLibrary.metadata.version,
    libraryHash: capLibrary.metadata.sourceHash, engineVersion: CAP_ENGINE_VERSION, status: "draft",
    scenarios: [scenario], selectedScenarioId: scenario.id, createdAt: now, updatedAt: now, notes: "" };
}
export function duplicateScenario(scenario: ParametricScenario, now = new Date().toISOString()): ParametricScenario {
  return { ...structuredClone(scenario), id: createId("cap-scenario"), name: `${scenario.name} — cópia`,
    result: null, createdAt: now, updatedAt: now };
}
