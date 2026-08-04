import { ProjectMasterRecord, createId } from "../../../domain/project-master-record";
import { ParametricEnvironmentStudy } from "../../cap/domain/cap-library-types";
import {
  ComplexityLevel, FeeCalculationStudy, FeeScenario, FeeSnapshot, HON_ENGINE_VERSION,
  HON_SCHEMA_VERSION, ProposalPricingSnapshot, ServiceCatalogItem, StructureProfile,
} from "../domain/hon-types";
import { calculateFeeStudy } from "./hon-engine";

export type ComplexityAnswers = Record<
  "existingBuilding" | "poorSurvey" | "multipleFloors" | "difficultTerrain" | "complexLegislation" |
  "condominium" | "occupiedConstruction" | "manyEnvironments" | "manyDisciplines" | "highDetail" |
  "premiumFinish" | "multipleDecisionMakers" | "criticalDeadline" | "bimDelivery" | "technicalRisk" |
  "externalApprovals" | "uncertainScope",
  0 | 1 | 2
>;

export function scoreComplexity(answers: ComplexityAnswers) {
  const score = Object.values(answers).reduce<number>((sum, value) => sum + value, 0);
  const level: ComplexityLevel = score <= 5 ? "very_simple" : score <= 11 ? "simple" : score <= 19 ? "medium" : score <= 27 ? "complex" : "very_complex";
  return { score, level, answeredCriteria: Object.keys(answers).length };
}

export function suggestUrgency(normalDays: number, requestedDays: number) {
  if (normalDays <= 0 || requestedDays <= 0 || requestedDays >= normalDays) return "normal" as const;
  const reduction = (normalDays - requestedDays) / normalDays * 100;
  if (requestedDays < normalDays * 0.5) return "emergency" as const;
  if (reduction <= 20) return "accelerated" as const;
  if (reduction <= 35) return "urgent" as const;
  if (reduction <= 50) return "very_urgent" as const;
  return "emergency" as const;
}

export function createProjectSnapshot(project: ProjectMasterRecord, capStudies: ParametricEnvironmentStudy[]) {
  const primaryClient = project.clients.find((client) => client.primary) ?? project.clients[0];
  const capApplied = project.needsProgram.reduce((sum, item) => sum + (item.appliedAreaM2 ?? 0) * item.quantity, 0);
  return {
    readAt: new Date().toISOString(), projectUpdatedAt: project.updatedAt, projectCode: project.code,
    projectName: project.commercialName || project.internalName, clientName: primaryClient?.preferredName || primaryClient?.name || "",
    city: project.property.city, state: project.property.state, propertyType: project.property.type,
    areas: { existing: project.property.existingBuiltAreaM2, expansion: project.property.estimatedExpansionAreaM2, demolition: project.property.estimatedDemolitionAreaM2, capApplied },
    floors: project.property.floors, scopeCodes: project.preliminaryScope.filter((item) => item.status !== "excluded").map((item) => item.serviceCode),
    capStudyIds: capStudies.map((item) => item.id), capLibraryVersions: [...new Set(capStudies.map((item) => item.libraryVersion))],
    manualChanges: [], divergences: [],
  };
}

export function createFeeStudy(project: ProjectMasterRecord, capStudies: ParametricEnvironmentStudy[], profile: StructureProfile, catalog: ServiceCatalogItem[], sequence: number): FeeCalculationStudy {
  const now = new Date().toISOString();
  const mappedServices = project.preliminaryScope.filter((item) => item.status !== "excluded").map((scope) => {
    const definition = catalog.find((item) => item.code === scope.serviceCode);
    return {
      id: createId("fee-service"), catalogItemId: definition?.id ?? null, code: scope.serviceCode,
      name: definition?.name ?? scope.name, stage: definition?.stage ?? "projeto", estimatedHours: definition?.baseHours ?? 0,
      hourlyCostCents: null, fixedCostCents: 0, minimumValueCents: definition?.minimumValueCents ?? 0,
      included: scope.status === "required" || scope.status === "under_review", notes: scope.notes,
    };
  });
  return {
    id: createId("fee-study"), schemaVersion: HON_SCHEMA_VERSION, projectId: project.id,
    code: `HON-${project.code}-${String(sequence).padStart(2, "0")}`, name: `Honorários — ${project.commercialName || project.internalName}`,
    version: 1, status: "draft", structureProfileId: profile.id, calculationMethod: "service_cost",
    projectSnapshot: createProjectSnapshot(project, capStudies),
    inputs: {
      calculationDate: now.slice(0, 10), complexityLevel: "simple", complexitySuggestedLevel: "simple", complexityScore: 0,
      complexityJustification: "", urgencyLevel: "normal", riskPercentage: 0, profitMarkup: profile.defaultProfitMarkup,
      taxPercentage: profile.taxes.percentage, taxMode: profile.taxes.mode, discountCents: 0, donationCents: 0,
      commercialPriceCents: null, minimumContractCents: profile.minimumContractCents, directExpensesCents: 0,
      areaReferenceM2: createProjectSnapshot(project, capStudies).areas.capApplied || project.property.existingBuiltAreaM2,
      constructionCostReferenceCents: project.budget.estimatedConstructionBudgetCents, cauReferencePercentage: null,
      cauReferenceSource: "Referência comparativa informada pelo arquiteto", commercialReferenceNotes: "",
    },
    services: mappedServices, partners: [], travel: [], revisions: [], risks: [],
    bim: { mode: "internal_method", percentage: 0, affectedBaseCents: 0, additionalHours: 0, nativeFile: false, ifc: false, federatedModel: false, lod: "", loi: "", disciplines: 0, cycles: 0, notes: "" },
    construction: { monitoringWeeks: 0, visitsPerWeek: 0, hoursPerVisit: 0, managementWeeklyHours: 0, managementWeeks: 0, dedicatedTeamCostCents: 0, notes: "" },
    discounts: [], donations: [], paymentPlan: null, results: null, snapshots: [], createdAt: now, updatedAt: now, approvedAt: null, notes: "",
  };
}

export function calculateAndVersionStudy(study: FeeCalculationStudy, profile: StructureProfile): FeeCalculationStudy {
  return { ...study, status: "calculated", results: calculateFeeStudy(study, profile), updatedAt: new Date().toISOString() };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
function checksum(value: unknown) {
  let hash = 0x811c9dc5;
  for (const character of stableStringify(value)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 0x01000193); }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function approveStudy(study: FeeCalculationStudy): { study: FeeCalculationStudy; snapshot: FeeSnapshot } {
  if (!study.results) throw new Error("Calcule o estudo antes de aprová-lo.");
  if (study.results.warnings.some((warning) => warning.includes("Horas internas ainda não estimadas"))) throw new Error("Não é possível aprovar sem estimativa de horas.");
  const approvedAt = new Date().toISOString(); const snapshotId = createId("fee-snapshot");
  const approved = { ...structuredClone(study), status: "approved" as const, approvedAt, updatedAt: approvedAt, snapshots: [...study.snapshots, snapshotId] };
  return { study: approved, snapshot: { id: snapshotId, studyId: study.id, projectId: study.projectId, studyVersion: study.version, engineVersion: HON_ENGINE_VERSION, approvedAt, payload: structuredClone(approved), checksum: checksum(approved) } };
}

export function createScenario(study: FeeCalculationStudy, name: string, paymentCondition: string): FeeScenario {
  if (!study.results) throw new Error("Calcule o estudo antes de criar um cenário.");
  const now = new Date().toISOString();
  return { id: createId("fee-scenario"), studyId: study.id, name, services: structuredClone(study.services), assumptions: [], complexity: study.inputs.complexityLevel, urgency: study.inputs.urgencyLevel, structureProfileId: study.structureProfileId, profitMarkup: study.inputs.profitMarkup, discount: study.inputs.discountCents, donation: study.inputs.donationCents, paymentCondition, result: structuredClone(study.results), createdAt: now, updatedAt: now };
}

export function createProposalPricingSnapshot(study: FeeCalculationStudy, scenarioId: string | null): ProposalPricingSnapshot {
  if (!study.results) throw new Error("Calcule o estudo para preparar o resumo comercial.");
  return { studyId: study.id, scenarioId, projectCode: study.projectSnapshot.projectCode, projectName: study.projectSnapshot.projectName,
    scope: study.services.filter((item) => item.included).map(({ name, stage, notes }) => ({ name, stage, notes })),
    commercialPriceCents: study.results.commercialPrice, finalPriceCents: study.results.finalPrice,
    paymentPlan: study.paymentPlan, exclusions: study.services.filter((item) => !item.included).map((item) => item.name),
    revisionPolicy: "Revisões incluídas conforme etapa; alterações de programa são serviço adicional.",
    visitPolicy: "Visitas e deslocamentos apenas quando expressamente incluídos.", createdAt: new Date().toISOString() };
}

export function assessCapacity(profile: StructureProfile, approvedStudies: FeeCalculationStudy[], months: number) {
  const monthlyCapacity = profile.capacity.weeklyAvailableHours * profile.capacity.averageWeeksPerMonth * profile.capacity.billableUtilizationPercentage / 100;
  const committed = approvedStudies.reduce((sum, item) => sum + (item.results?.totalEstimatedHours ?? 0), 0);
  const available = monthlyCapacity * Math.max(1, months); const overload = Math.max(0, committed - available);
  return { monthlyCapacity, committedHours: committed, availableHours: available, overloadHours: overload, needsPartner: overload > 0, deadlineRisk: overload > 0 ? "high" : committed > available * 0.85 ? "medium" : "low" };
}
