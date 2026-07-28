import { ProjectMasterRecord, ProjectReadiness, ValidationResult } from "./project-master-record";

export function calculateReadiness(project: ProjectMasterRecord, level: ProjectReadiness): ValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];
  const addRequirement = (valid: boolean, label: string) => { if (!valid) missing.push(label); };
  addRequirement(Boolean(project.code), "Código");
  addRequirement(Boolean(project.internalName.trim() || project.commercialName.trim()), "Nome interno ou comercial");
  addRequirement(project.clients.some((client) => Boolean(client.name.trim())), "Cliente com nome");
  addRequirement(Boolean(project.property.city.trim()), "Cidade do imóvel");
  addRequirement(Boolean(project.initialSynthesis.trim()), "Síntese inicial");
  if (level !== "draft") {
    addRequirement(Boolean(project.context.mainProblem.trim() || project.context.requestSummary.trim()), "Contexto mínimo");
    addRequirement(Boolean(project.context.objectives.trim()), "Objetivo principal");
    addRequirement(Boolean(project.property.type.trim()), "Tipo do imóvel");
    addRequirement(Boolean(project.property.condition.trim()), "Situação do imóvel");
    addRequirement(project.preliminaryScope.length > 0, "Escopo preliminar");
    addRequirement(project.needsProgram.length > 0 || project.context.openQuestions.includes("programa"), "Programa ou indicação de definição");
    addRequirement(project.clients.some((client) => client.primary && Boolean(client.name.trim())), "Contato principal");
  }
  if (level === "survey" || level === "proposal") {
    addRequirement(Boolean(project.property.address.trim() || project.property.mapUrl.trim()), "Endereço ou localização");
    addRequirement(project.visits.some((visit) => visit.type === "survey" && visit.status !== "cancelled"), "Visita de levantamento");
    addRequirement(Boolean(project.primaryResponsible.trim()), "Responsável");
    addRequirement(project.documents.some((document) => document.required), "Checklist mínimo de documentos");
    addRequirement(Boolean(project.property.apparentCondition.trim()), "Condição aparente do imóvel");
  }
  if (level === "proposal") {
    addRequirement(project.preliminaryScope.every((item) => item.status !== "not_defined"), "Status do escopo definido");
    addRequirement(Boolean(project.planning.minimumRequiredTime || project.planning.desiredDesignStartDate), "Prazos mínimos");
    addRequirement(project.budget.investmentRange !== "not_informed" || project.budget.definitionLevel === "undefined", "Orçamento ou declaração de não informado");
    addRequirement(project.team.some((member) => member.status === "active"), "Responsável interno ativo");
    addRequirement(!project.pending.some((item) => item.status === "blocked"), "Sem pendências bloqueadoras");
    addRequirement(!["completed", "archived"].includes(project.projectPhase), "Fase coerente");
  }
  const { desiredDesignStartDate, desiredConstructionStartDate, desiredCompletionDate, surveyDate } = project.planning;
  if (desiredDesignStartDate && desiredCompletionDate && desiredCompletionDate < desiredDesignStartDate) warnings.push("Conclusão anterior ao início do projeto.");
  if (desiredConstructionStartDate && desiredDesignStartDate && desiredConstructionStartDate < desiredDesignStartDate) warnings.push("Obra prevista antes do início do projeto.");
  if (surveyDate && desiredDesignStartDate && surveyDate > desiredDesignStartDate) warnings.push("Levantamento previsto após o início do projeto.");
  return { level, valid: missing.length === 0, missing, warnings };
}
