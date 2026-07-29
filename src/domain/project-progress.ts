import { ProjectMasterRecord } from "./project-master-record";

export type SectionKey = "identification" | "clients" | "property" | "context" | "scope" |
  "program" | "planning" | "budget" | "visits" | "documents" | "team" | "records";
export interface SectionProgress {
  percentage: number; complete: number; required: number; missing: string[]; warnings: string[];
}
export const SECTION_WEIGHTS: Record<SectionKey, number> = {
  identification: 10, clients: 10, property: 12, context: 10, scope: 12, program: 12,
  planning: 8, budget: 7, visits: 5, documents: 5, team: 4, records: 5,
};
const sectionChecks = (project: ProjectMasterRecord): Record<SectionKey, [string, boolean][]> => ({
  identification: [["nome", Boolean(project.internalName || project.commercialName)], ["fase", Boolean(project.projectPhase)], ["responsável", Boolean(project.primaryResponsible)]],
  clients: [["cliente", project.clients.some((item) => Boolean(item.name.trim()))], ["contato principal", project.clients.some((item) => item.primary && Boolean(item.name.trim()))]],
  property: [["cidade", Boolean(project.property.city)], ["tipo", Boolean(project.property.type)], ["situação", Boolean(project.property.condition)]],
  context: [["síntese", Boolean(project.initialSynthesis)], ["problema", Boolean(project.context.mainProblem)], ["objetivos", Boolean(project.context.objectives)]],
  scope: [["item de escopo", project.preliminaryScope.some((item) => item.status !== "excluded")], ["status definido", project.preliminaryScope.every((item) => item.status !== "not_defined")]],
  program: [["programa", project.needsProgram.length > 0], ["prioridades", project.needsProgram.every((item) => Boolean(item.priority))]],
  planning: [["prazo mínimo", Boolean(project.planning.minimumRequiredTime || project.planning.desiredDesignStartDate)], ["urgência", Boolean(project.planning.urgency)]],
  budget: [["faixa/declaração", project.budget.investmentRange !== "not_informed" || project.budget.definitionLevel === "undefined"], ["nível", Boolean(project.budget.definitionLevel)]],
  visits: [["visita", project.visits.length > 0]],
  documents: [["checklist", project.documents.length > 0]],
  team: [["responsável interno", project.team.some((item) => item.status === "active")]],
  records: [["controle de pendências", !project.pending.some((item) => item.status === "blocked")]],
});
export function calculateSectionProgress(project: ProjectMasterRecord, section: SectionKey): SectionProgress {
  const checks = sectionChecks(project)[section];
  const complete = checks.filter(([, done]) => done).length;
  return {
    percentage: Math.round((complete / checks.length) * 100), complete, required: checks.length,
    missing: checks.filter(([, done]) => !done).map(([label]) => label),
    warnings: overduePending(project).map((item) => `Pendência vencida: ${item.description}`),
  };
}
export function calculateOverallProgress(project: ProjectMasterRecord) {
  return Math.round((Object.entries(SECTION_WEIGHTS) as [SectionKey, number][])
    .reduce((total, [key, weight]) => total + calculateSectionProgress(project, key).percentage * weight / 100, 0));
}
export function overduePending(project: ProjectMasterRecord, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return project.pending.filter((item) =>
    Boolean(item.dueDate) && item.dueDate < today && !["completed", "cancelled"].includes(item.status));
}
export function summarizeAreas(project: ProjectMasterRecord) {
  const sum = (key: "existingAreaM2" | "desiredAreaM2") =>
    project.needsProgram.reduce((total, item) => total + (item[key] ?? 0) * item.quantity, 0);
  const existing = sum("existingAreaM2");
  const desired = sum("desiredAreaM2");
  return {
    existing, desired, expansion: Math.max(0, desired - existing),
    demolition: project.property.estimatedDemolitionAreaM2 ?? 0,
    environments: project.needsProgram.reduce((total, item) => total + item.quantity, 0),
    essential: project.needsProgram.filter((item) => item.priority === "essential").length,
    underReview: project.needsProgram.filter((item) => item.priority === "under_review").length,
  };
}
