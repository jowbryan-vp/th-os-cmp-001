import { ProjectMasterRecord, createHistoryEvent } from "../../../domain/project-master-record";
import { ParametricEnvironmentStudy, ParametricScenario } from "../domain/cap-library-types";

export type AppliedAreaType = "minimum" | "recommended" | "preliminary_gross";

export function getScenarioArea(scenario: ParametricScenario, areaType: AppliedAreaType): number {
  if (!scenario.result) throw new Error("Calcule o cenário antes de aplicá-lo ao programa.");
  if (areaType === "minimum") return scenario.result.minimumNetAreaM2;
  if (areaType === "recommended") return scenario.result.recommendedNetAreaM2;
  return scenario.result.estimatedGrossAreaM2;
}

export function applyScenarioToNeedsProgram(
  project: ProjectMasterRecord,
  study: ParametricEnvironmentStudy,
  scenario: ParametricScenario,
  areaType: AppliedAreaType,
  calculatedAt = new Date().toISOString(),
): ProjectMasterRecord {
  const needsItemId = study.needsProgramItemId;
  if (!needsItemId) throw new Error("Vincule o estudo a um item do Programa de Necessidades.");
  if (!project.needsProgram.some((item) => item.id === needsItemId)) {
    throw new Error("O item do Programa de Necessidades vinculado não existe neste projeto.");
  }
  const areaM2 = getScenarioArea(scenario, areaType);
  return {
    ...project,
    needsProgram: project.needsProgram.map((item) => item.id === needsItemId ? {
      ...item,
      desiredAreaM2: areaM2,
      parametricStudyId: study.id,
      parametricScenarioId: scenario.id,
      appliedAreaType: areaType,
      appliedAreaM2: areaM2,
      capLibraryVersion: study.libraryVersion,
      calculationEngineVersion: study.engineVersion,
      calculatedAt,
    } : item),
    history: [...project.history, createHistoryEvent(
      "cap_area_applied",
      `CAP-001: ${areaM2.toFixed(2)} m² (${areaType}) aplicados ao Programa de Necessidades.`,
      calculatedAt,
    )],
    updatedAt: calculatedAt,
  };
}
