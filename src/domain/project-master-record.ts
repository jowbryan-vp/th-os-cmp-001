export const PROJECT_SCHEMA_VERSION = 2;
export const APPLICATION_ID = "TH-OS-CMP-001";

export const recordStatuses = ["draft", "active", "archived"] as const;
export const projectPhases = [
  "pre_service", "meeting_scheduled", "survey", "proposal_preparation",
  "proposal_sent", "negotiation", "contracted", "design", "approval",
  "construction", "suspended", "completed", "archived",
] as const;
export const priorities = ["low", "medium", "high", "urgent"] as const;
export const readinessLevels = ["draft", "meeting", "survey", "proposal"] as const;
export type RecordStatus = (typeof recordStatuses)[number];
export type ProjectPhase = (typeof projectPhases)[number];
export type Priority = (typeof priorities)[number];
export type ProjectReadiness = (typeof readinessLevels)[number];

export const phaseLabels: Record<ProjectPhase, string> = {
  pre_service: "Pré-atendimento", meeting_scheduled: "Reunião agendada",
  survey: "Levantamento", proposal_preparation: "Proposta em preparação",
  proposal_sent: "Proposta enviada", negotiation: "Negociação",
  contracted: "Contratado", design: "Projeto", approval: "Aprovação",
  construction: "Obra", suspended: "Suspenso", completed: "Concluído",
  archived: "Arquivado",
};
export const statusLabels: Record<RecordStatus, string> = {
  draft: "Rascunho", active: "Ativo", archived: "Arquivado",
};
export const priorityLabels: Record<Priority, string> = {
  low: "Baixa", medium: "Média", high: "Alta", urgent: "Urgente",
};

export interface ClientRecord {
  id: string; personType: "individual" | "company"; projectRole: string;
  name: string; preferredName: string; cpf: string; cnpj: string; rg: string;
  stateRegistration: string; profession: string; phone: string; secondaryPhone: string;
  email: string; address: string; city: string; state: string; postalCode: string;
  preferredChannel: "whatsapp" | "phone" | "email" | "in_person" | "other";
  bestContactTime: string;
  decisionPower: "decision_maker" | "co_decision_maker" | "influencer" | "contact_only";
  notes: string; primary: boolean;
}

export interface PropertyRecord {
  type: string; condition: string; address: string; city: string; state: string;
  postalCode: string; latitude: number | null; longitude: number | null; mapUrl: string;
  municipalRegistration: string; registryNumber: string; lot: string; block: string;
  condominium: string; landAreaM2: number | null; existingBuiltAreaM2: number | null;
  estimatedExpansionAreaM2: number | null; estimatedDemolitionAreaM2: number | null;
  floors: number | null; approximateYear: number | null; occupancy: string;
  relationshipToProperty: string; hasPreviousProject: boolean | null;
  hasBuildingPermit: boolean | null; hasOccupancyPermit: boolean | null;
  hasSurvey: boolean | null; hasComplementaryProjects: boolean | null;
  apparentCondition: string; constraints: string; notes: string;
}

export interface ProjectContext {
  requestSummary: string; mainProblem: string; objectives: string; partsToKeep: string;
  partsToFinish: string; partsToDemolish: string; partsToExpand: string;
  prioritySpaces: string; aestheticExpectations: string; functionalExpectations: string;
  comfortExpectations: string; lightingExpectations: string; ventilationExpectations: string;
  accessibilityExpectations: string; sustainabilityExpectations: string;
  bioclimaticExpectations: string; restrictions: string; risks: string;
  existingDecisions: string; openQuestions: string; notes: string;
}

export type ScopeCategory = "design" | "construction" | "outsourced";
export type ScopeStatus = "required" | "under_review" | "optional" | "not_defined" | "excluded";
export type ExecutionMode = "internal" | "partner" | "outsourced" | "client" | "not_defined";
export interface PreliminaryScopeItem {
  id: string; category: ScopeCategory; serviceCode: string; name: string;
  status: ScopeStatus; executionMode: ExecutionMode; responsible: string;
  notes: string; order: number;
}

export interface NeedsItem {
  id: string; environment: string; sector: string; floor: string;
  currentSituation: "existing" | "new" | "to_expand" | "to_reform" | "to_demolish" | "under_review";
  intervention: "maintain" | "finish" | "reform" | "expand" | "create" | "demolish" | "study";
  existingAreaM2: number | null; desiredAreaM2: number | null; quantity: number;
  priority: "essential" | "important" | "desirable" | "under_review";
  users: string; needs: string; lighting: string; ventilation: string; privacy: string;
  accessibility: string; furniture: string; equipment: string; connections: string;
  notes: string; order: number;
}

export interface PlanningRecord {
  firstContactDate: string; meetingDate: string; surveyDate: string;
  desiredDesignStartDate: string; desiredConstructionStartDate: string;
  desiredCompletionDate: string; urgency: string; restrictions: string;
  minimumRequiredTime: string; notes: string;
}
export interface TimelineItem { id: string; title: string; date: string; notes: string; }
export interface BudgetRecord {
  estimatedConstructionBudgetCents: number | null;
  investmentRange: "not_informed" | "up_to_100k" | "100k_to_250k" | "250k_to_500k" | "500k_to_1m" | "above_1m" | "custom";
  fundingSource: string; availableAmountCents: number | null; financing: boolean | null;
  reserveAmountCents: number | null; contingencyPercentage: number | null;
  decisionPriority: "cost" | "deadline" | "quality" | "balance";
  definitionLevel: "undefined" | "preliminary" | "estimated" | "confirmed"; notes: string;
}
export interface VisitRecord {
  id: string; type: "first_meeting" | "survey" | "technical_visit" | "construction_monitoring" | "client_meeting" | "other";
  date: string; time: string; city: string; address: string; responsible: string;
  participants: string; estimatedDurationMinutes: number | null;
  actualDurationMinutes: number | null; purpose: string; notes: string;
  reportRequired: boolean;
  status: "planned" | "confirmed" | "completed" | "cancelled";
  estimatedExpensesCents: number | null;
}
export interface DocumentReference {
  id: string; name: string; category: string; required: boolean;
  status: "not_requested" | "requested" | "received" | "incomplete" | "not_available" | "not_applicable";
  requestedAt: string; receivedAt: string; notes: string; fileName: string;
  futureLink: string; responsible: string;
}
export interface TeamMember {
  id: string; name: string; function: string; profession: string; company: string;
  phone: string; email: string; responsibility: string; engagementType: string;
  status: "suggested" | "invited" | "active" | "inactive"; notes: string;
}
export type ImpactLevel = "none" | "low" | "medium" | "high" | "unknown";
export interface DecisionRecord {
  id: string; date: string; subject: string; decision: string; origin: string;
  participants: string; phase: ProjectPhase; costImpact: ImpactLevel;
  deadlineImpact: ImpactLevel; scopeImpact: ImpactLevel; responsible: string; notes: string;
}
export interface PendingRecord {
  id: string; description: string; category: string; responsible: string; dueDate: string;
  priority: Priority; status: "open" | "in_progress" | "blocked" | "completed" | "cancelled";
  dependency: string; affectedPhase: ProjectPhase; notes: string; completedAt: string | null;
}
export interface HistoryEntry {
  id: string; at: string;
  action: "created" | "edited" | "phase_changed" | "status_changed" | "duplicated" |
    "imported" | "exported" | "archived" | "restored" | "deleted" | "scope_changed";
  detail: string;
}

export interface ProjectMasterRecord {
  id: string; schemaVersion: number; code: string; internalName: string;
  commercialName: string; recordStatus: RecordStatus; projectPhase: ProjectPhase;
  priority: Priority; createdAt: string; updatedAt: string; archivedAt: string | null;
  primaryResponsible: string; contactOrigin: string; internalNotes: string;
  clients: ClientRecord[]; property: PropertyRecord; initialSynthesis: string;
  context: ProjectContext; preliminaryScope: PreliminaryScopeItem[];
  needsProgram: NeedsItem[]; planning: PlanningRecord; timeline: TimelineItem[];
  budget: BudgetRecord; visits: VisitRecord[]; documents: DocumentReference[];
  team: TeamMember[]; decisions: DecisionRecord[]; pending: PendingRecord[];
  history: HistoryEntry[];
}

export interface ValidationResult { level: ProjectReadiness; valid: boolean; missing: string[]; warnings: string[]; }
export function createId(prefix = "item") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
export function createHistoryEvent(action: HistoryEntry["action"], detail: string, at = new Date().toISOString()): HistoryEntry {
  return { id: createId("history"), at, action, detail };
}

export const emptyProperty = (): PropertyRecord => ({
  type: "", condition: "", address: "", city: "", state: "", postalCode: "",
  latitude: null, longitude: null, mapUrl: "", municipalRegistration: "",
  registryNumber: "", lot: "", block: "", condominium: "", landAreaM2: null,
  existingBuiltAreaM2: null, estimatedExpansionAreaM2: null,
  estimatedDemolitionAreaM2: null, floors: null, approximateYear: null,
  occupancy: "", relationshipToProperty: "", hasPreviousProject: null,
  hasBuildingPermit: null, hasOccupancyPermit: null, hasSurvey: null,
  hasComplementaryProjects: null, apparentCondition: "", constraints: "", notes: "",
});
export const emptyContext = (): ProjectContext => ({
  requestSummary: "", mainProblem: "", objectives: "", partsToKeep: "", partsToFinish: "",
  partsToDemolish: "", partsToExpand: "", prioritySpaces: "", aestheticExpectations: "",
  functionalExpectations: "", comfortExpectations: "", lightingExpectations: "",
  ventilationExpectations: "", accessibilityExpectations: "", sustainabilityExpectations: "",
  bioclimaticExpectations: "", restrictions: "", risks: "", existingDecisions: "",
  openQuestions: "", notes: "",
});
export const emptyPlanning = (): PlanningRecord => ({
  firstContactDate: "", meetingDate: "", surveyDate: "", desiredDesignStartDate: "",
  desiredConstructionStartDate: "", desiredCompletionDate: "", urgency: "",
  restrictions: "", minimumRequiredTime: "", notes: "",
});
export const emptyBudget = (): BudgetRecord => ({
  estimatedConstructionBudgetCents: null, investmentRange: "not_informed",
  fundingSource: "", availableAmountCents: null, financing: null, reserveAmountCents: null,
  contingencyPercentage: null, decisionPriority: "balance", definitionLevel: "undefined", notes: "",
});
export const createEmptyClient = (): ClientRecord => ({
  id: createId("client"), personType: "individual", projectRole: "Cliente", name: "",
  preferredName: "", cpf: "", cnpj: "", rg: "", stateRegistration: "", profession: "",
  phone: "", secondaryPhone: "", email: "", address: "", city: "", state: "", postalCode: "",
  preferredChannel: "whatsapp", bestContactTime: "", decisionPower: "decision_maker",
  notes: "", primary: true,
});
export function createEmptyProject(code: string, now = new Date().toISOString()): ProjectMasterRecord {
  return {
    id: createId("project"), schemaVersion: PROJECT_SCHEMA_VERSION, code,
    internalName: "Novo projeto", commercialName: "", recordStatus: "draft",
    projectPhase: "pre_service", priority: "medium", createdAt: now, updatedAt: now,
    archivedAt: null, primaryResponsible: "", contactOrigin: "", internalNotes: "",
    clients: [createEmptyClient()], property: emptyProperty(), initialSynthesis: "",
    context: emptyContext(), preliminaryScope: [], needsProgram: [],
    planning: emptyPlanning(), timeline: [], budget: emptyBudget(), visits: [],
    documents: [], team: [], decisions: [], pending: [],
    history: [createHistoryEvent("created", "Cadastro mestre iniciado.", now)],
  };
}

const scopeNames: Record<string, string> = {
  cadastral_survey: "Levantamento cadastral", architectural_design: "Projeto arquitetônico",
  renovation: "Projeto arquitetônico de reforma", expansion: "Ampliação", interiors: "Interiores",
  lighting: "Iluminação", electrical_points: "Pontos elétricos", plumbing_points: "Pontos hidráulicos",
  furniture: "Mobiliário", landscape: "Paisagismo", bim_modeling: "Modelagem BIM",
  bim_coordination: "Compatibilização BIM", legal_project: "Projeto legal",
  regularization: "Regularização", feasibility_study: "Estudo de viabilidade",
  bioclimatic_consulting: "Consultoria bioclimática", sustainability: "Sustentabilidade",
  procurement_assistance: "Assistência a compras", construction_monitoring: "Acompanhamento de obra",
  partial_management: "Gerenciamento parcial", intensive_management: "Gerenciamento intensivo",
  dedicated_management: "Gerenciamento dedicado", project_closeout: "Encerramento de obra",
  as_built: "As built", structural: "Projeto estrutural", electrical: "Projeto elétrico",
  plumbing: "Projeto hidrossanitário", hvac: "Climatização", fire_safety: "Prevenção contra incêndio",
  rendering: "Renderização", lighting_design: "Lighting design", soil_investigation: "Sondagem",
  topography: "Topografia", budgeting: "Orçamentação", other: "Outro",
};
const designCodes = ["cadastral_survey", "architectural_design", "renovation", "expansion", "interiors", "lighting", "electrical_points", "plumbing_points", "furniture", "landscape", "bim_modeling", "bim_coordination", "legal_project", "regularization", "feasibility_study", "bioclimatic_consulting", "sustainability"];
const constructionCodes = ["procurement_assistance", "construction_monitoring", "partial_management", "intensive_management", "dedicated_management", "project_closeout", "as_built"];
const outsourcedCodes = ["structural", "electrical", "plumbing", "hvac", "fire_safety", "rendering", "lighting_design", "soil_investigation", "topography", "budgeting", "other"];
export const scopeCatalog = [
  ...designCodes.map((serviceCode) => ({ serviceCode, category: "design" as const, name: scopeNames[serviceCode] })),
  ...constructionCodes.map((serviceCode) => ({ serviceCode, category: "construction" as const, name: scopeNames[serviceCode] })),
  ...outsourcedCodes.map((serviceCode) => ({ serviceCode, category: "outsourced" as const, name: scopeNames[serviceCode] })),
];
export function createScopeItem(serviceCode: string, status: ScopeStatus = "not_defined", order = 0): PreliminaryScopeItem {
  const catalog = scopeCatalog.find((item) => item.serviceCode === serviceCode);
  return {
    id: createId("scope"), category: catalog?.category ?? "design", serviceCode,
    name: catalog?.name ?? serviceCode, status, executionMode: "not_defined",
    responsible: "", notes: "", order,
  };
}

const PILOT_AT = "2026-01-01T12:00:00.000Z";
export const pilotProject: ProjectMasterRecord = {
  ...createEmptyProject("TH-2026-001", PILOT_AT),
  id: "project-th-2026-001", internalName: "Reforma e Ampliação Residencial — Projeto Piloto",
  commercialName: "", recordStatus: "active", projectPhase: "pre_service", priority: "medium",
  clients: [createEmptyClient()],
  property: {
    ...emptyProperty(), type: "Residência unifamiliar", condition: "Construção inacabada",
    city: "Cacoal", state: "RO",
  },
  initialSynthesis: "O cliente adquiriu uma residência já construída, porém não finalizada. Pretende concluir os serviços existentes, revisar a organização dos ambientes e estudar uma ampliação residencial. Também serão avaliadas as necessidades de interiores, iluminação, mobiliário, compatibilização e acompanhamento de obra.",
  context: {
    ...emptyContext(),
    requestSummary: "Concluir a construção existente, revisar ambientes e estudar ampliação residencial.",
    mainProblem: "Residência adquirida ainda não finalizada.",
    objectives: "Consolidar o diagnóstico e definir com segurança o escopo da reforma e ampliação.",
  },
  preliminaryScope: [
    createScopeItem("cadastral_survey", "required", 0),
    createScopeItem("renovation", "required", 1),
    createScopeItem("expansion", "required", 2),
    createScopeItem("feasibility_study", "under_review", 3),
    createScopeItem("interiors", "under_review", 4),
    createScopeItem("lighting", "under_review", 5),
    createScopeItem("furniture", "under_review", 6),
    createScopeItem("bim_coordination", "under_review", 7),
    createScopeItem("construction_monitoring", "under_review", 8),
    createScopeItem("partial_management", "not_defined", 9),
  ],
  history: [{
    id: "history-pilot-created", at: PILOT_AT, action: "created",
    detail: "Projeto piloto real de Cacoal inserido.",
  }],
};

export const teamSuggestions = [
  { name: "Thaylana", profession: "Arquiteta" },
  { name: "Nathan", profession: "Engenheiro Civil" },
  { name: "Nathalia", profession: "Arquiteta" },
];
