import { NeedsItem, ProjectMasterRecord, createHistoryEvent } from "../../../domain/project-master-record";
import { ParametricEnvironmentStudy, ParametricScenario } from "../domain/cap-library-types";

export type AppliedAreaType = "minimum" | "recommended" | "preliminary_gross";

export function getScenarioArea(scenario: ParametricScenario, areaType: AppliedAreaType): number {
  if (!scenario.result) throw new Error("Calcule o cenário antes de aplicá-lo ao programa.");
  if (areaType === "minimum") return scenario.result.minimumNetAreaM2;
  if (areaType === "recommended") return scenario.result.recommendedNetAreaM2;
  return scenario.result.estimatedGrossAreaM2;
}

function getScenarioAreaOptions(scenario: ParametricScenario) {
  if (!scenario.result) throw new Error("Calcule o cenário antes de registrá-lo no programa.");
  return {
    capMinimumAreaM2: scenario.result.minimumNetAreaM2,
    capRecommendedAreaM2: scenario.result.recommendedNetAreaM2,
    capPreliminaryGrossAreaM2: scenario.result.estimatedGrossAreaM2,
  };
}

function assertLinkedNeed(project: ProjectMasterRecord, study: ParametricEnvironmentStudy) {
  const needsItemId = study.needsProgramItemId;
  if (!needsItemId) throw new Error("Vincule o estudo a um item do Programa de Necessidades.");
  if (!project.needsProgram.some((item) => item.id === needsItemId)) {
    throw new Error("O item do Programa de Necessidades vinculado não existe neste projeto.");
  }
  return needsItemId;
}

export function saveScenarioOptionsToNeedsProgram(
  project: ProjectMasterRecord,
  study: ParametricEnvironmentStudy,
  scenario: ParametricScenario,
  calculatedAt = new Date().toISOString(),
): ProjectMasterRecord {
  const needsItemId = assertLinkedNeed(project, study);
  const options = getScenarioAreaOptions(scenario);
  return {
    ...project,
    needsProgram: project.needsProgram.map((item) => item.id === needsItemId ? {
      ...item,
      ...options,
      parametricStudyId: study.id,
      parametricScenarioId: scenario.id,
      capLibraryVersion: study.libraryVersion,
      calculationEngineVersion: study.engineVersion,
      calculatedAt,
    } : item),
    history: [...project.history, createHistoryEvent(
      "cap_options_saved",
      `CAP-001: três opções de área registradas para escolha posterior.`,
      calculatedAt,
    )],
    updatedAt: calculatedAt,
  };
}

export function summarizeCapAreaOptions(needsProgram: NeedsItem[]) {
  return needsProgram.reduce((summary, item) => {
    if (item.capMinimumAreaM2 === null || item.capRecommendedAreaM2 === null
      || item.capPreliminaryGrossAreaM2 === null) return summary;
    const quantity = Math.max(1, item.quantity);
    return {
      minimumAreaM2: summary.minimumAreaM2 + item.capMinimumAreaM2 * quantity,
      recommendedAreaM2: summary.recommendedAreaM2 + item.capRecommendedAreaM2 * quantity,
      preliminaryGrossAreaM2: summary.preliminaryGrossAreaM2 + item.capPreliminaryGrossAreaM2 * quantity,
      calculatedEnvironments: summary.calculatedEnvironments + quantity,
      totalEnvironments: summary.totalEnvironments,
    };
  }, {
    minimumAreaM2: 0,
    recommendedAreaM2: 0,
    preliminaryGrossAreaM2: 0,
    calculatedEnvironments: 0,
    totalEnvironments: needsProgram.reduce((total, item) => total + Math.max(1, item.quantity), 0),
  });
}

export function applyScenarioToNeedsProgram(
  project: ProjectMasterRecord,
  study: ParametricEnvironmentStudy,
  scenario: ParametricScenario,
  areaType: AppliedAreaType,
  calculatedAt = new Date().toISOString(),
): ProjectMasterRecord {
  const needsItemId = assertLinkedNeed(project, study);
  const areaM2 = getScenarioArea(scenario, areaType);
  const options = getScenarioAreaOptions(scenario);
  return {
    ...project,
    needsProgram: project.needsProgram.map((item) => item.id === needsItemId ? {
      ...item,
      ...options,
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
