export const PROJECT_SCHEMA_VERSION = 1;

export type ProjectStatus = "draft" | "active" | "archived";
export type ProjectReadiness = "draft" | "meeting" | "proposal";

export interface ClientRecord {
  id: string;
  name: string;
  document: string;
  email: string;
  phone: string;
  role: string;
  primary: boolean;
}

export interface PropertyRecord {
  address: string;
  city: string;
  state: string;
  postalCode: string;
  area: string;
  typology: string;
  occupancy: string;
  constraints: string;
}

export interface NeedsItem {
  id: string;
  environment: string;
  quantity: number;
  requirements: string;
}

export interface TimelineItem {
  id: string;
  title: string;
  targetDate: string;
  notes: string;
}

export interface VisitRecord {
  id: string;
  date: string;
  purpose: string;
  participants: string;
  notes: string;
}

export interface DocumentReference {
  id: string;
  title: string;
  type: string;
  reference: string;
  notes: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  contact: string;
  organization: string;
}

export interface DecisionRecord {
  id: string;
  date: string;
  title: string;
  description: string;
  responsible: string;
}

export interface PendingRecord {
  id: string;
  title: string;
  responsible: string;
  dueDate: string;
  priority: "low" | "medium" | "high";
  status: "open" | "done";
}

export interface HistoryEntry {
  id: string;
  at: string;
  action: string;
  detail: string;
}

export interface ProjectMasterRecord {
  id: string;
  schemaVersion: number;
  code: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  title: string;
  projectType: string;
  phase: string;
  summary: string;
  context: string;
  objectives: string;
  preliminaryScope: string[];
  needsProgram: NeedsItem[];
  clients: ClientRecord[];
  property: PropertyRecord;
  timeline: TimelineItem[];
  estimatedBudget: string;
  budgetNotes: string;
  visits: VisitRecord[];
  documents: DocumentReference[];
  team: TeamMember[];
  decisions: DecisionRecord[];
  pending: PendingRecord[];
  history: HistoryEntry[];
}

export interface ValidationResult {
  level: ProjectReadiness;
  valid: boolean;
  missing: string[];
}

export const preliminaryScopeOptions = [
  "Levantamento e diagnóstico",
  "Estudo preliminar",
  "Projeto arquitetônico",
  "Projeto de interiores",
  "Compatibilização",
  "Projeto legal",
  "Projeto executivo",
  "Acompanhamento técnico",
];

export function createId(prefix = "item") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyProject(code: string): ProjectMasterRecord {
  const now = new Date().toISOString();
  return {
    id: createId("project"),
    schemaVersion: PROJECT_SCHEMA_VERSION,
    code,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    title: "Novo projeto",
    projectType: "",
    phase: "Cadastro inicial",
    summary: "",
    context: "",
    objectives: "",
    preliminaryScope: [],
    needsProgram: [],
    clients: [
      {
        id: createId("client"),
        name: "",
        document: "",
        email: "",
        phone: "",
        role: "Cliente",
        primary: true,
      },
    ],
    property: {
      address: "",
      city: "",
      state: "",
      postalCode: "",
      area: "",
      typology: "",
      occupancy: "",
      constraints: "",
    },
    timeline: [],
    estimatedBudget: "",
    budgetNotes: "",
    visits: [],
    documents: [],
    team: [],
    decisions: [],
    pending: [],
    history: [
      {
        id: createId("history"),
        at: now,
        action: "Cadastro criado",
        detail: "Registro mestre iniciado.",
      },
    ],
  };
}

export const pilotProject: ProjectMasterRecord = {
  ...createEmptyProject("TH-2026-001"),
  id: "project-th-2026-001",
  createdAt: "2026-01-01T12:00:00.000Z",
  updatedAt: "2026-01-01T12:00:00.000Z",
  status: "active",
  title: "Residência Piloto TH",
  projectType: "Arquitetura residencial",
  phase: "Levantamento inicial",
  summary:
    "Projeto piloto do Cadastro Mestre, criado para validar o fluxo de organização das informações antes de reuniões e propostas.",
  context:
    "Residência unifamiliar em Manaus, com integração entre áreas internas e externas e atenção ao clima local.",
  objectives:
    "Consolidar necessidades, condicionantes, responsáveis e decisões em uma fonte única de consulta.",
  preliminaryScope: [
    "Levantamento e diagnóstico",
    "Estudo preliminar",
    "Projeto arquitetônico",
  ],
  clients: [
    {
      id: "client-pilot-1",
      name: "Cliente piloto",
      document: "",
      email: "",
      phone: "",
      role: "Responsável principal",
      primary: true,
    },
  ],
  property: {
    address: "",
    city: "Manaus",
    state: "AM",
    postalCode: "",
    area: "",
    typology: "Residencial",
    occupancy: "Uso familiar",
    constraints: "Informações preliminares; confirmar levantamento do imóvel.",
  },
  needsProgram: [
    {
      id: "need-pilot-1",
      environment: "Área social integrada",
      quantity: 1,
      requirements: "Sala, cozinha e varanda com relação direta com o exterior.",
    },
  ],
  pending: [
    {
      id: "pending-pilot-1",
      title: "Confirmar documentação disponível do imóvel",
      responsible: "Equipe TH",
      dueDate: "",
      priority: "high",
      status: "open",
    },
  ],
  history: [
    {
      id: "history-pilot-created",
      at: "2026-01-01T12:00:00.000Z",
      action: "Cadastro criado",
      detail: "Registro mestre piloto iniciado.",
    },
  ],
};

export function validateProject(
  project: ProjectMasterRecord,
  level: ProjectReadiness,
): ValidationResult {
  const missing: string[] = [];
  if (!project.title.trim()) missing.push("Identificação: nome do projeto");
  if (!project.projectType.trim()) missing.push("Identificação: tipo de projeto");
  if (!project.clients.some((client) => client.name.trim())) {
    missing.push("Clientes: ao menos um nome");
  }

  if (level === "meeting" || level === "proposal") {
    if (!project.summary.trim()) missing.push("Síntese inicial");
    if (!project.context.trim()) missing.push("Contexto do projeto");
    if (!project.property.city.trim()) missing.push("Imóvel: cidade");
    if (project.preliminaryScope.length === 0) missing.push("Escopo preliminar");
    if (project.needsProgram.length === 0) {
      missing.push("Programa inicial de necessidades");
    }
  }

  if (level === "proposal") {
    if (!project.objectives.trim()) missing.push("Objetivos do projeto");
    if (project.timeline.length === 0) missing.push("Prazos e marcos");
    if (!project.estimatedBudget.trim()) missing.push("Orçamento estimado");
    if (project.pending.some((item) => item.priority === "high" && item.status === "open")) {
      missing.push("Resolver pendências de alta prioridade");
    }
  }

  return { level, valid: missing.length === 0, missing };
}

export function calculateProjectProgress(project: ProjectMasterRecord) {
  const checks = [
    Boolean(project.title.trim()),
    Boolean(project.projectType.trim()),
    project.clients.some((client) => Boolean(client.name.trim())),
    Boolean(project.property.city.trim()),
    Boolean(project.context.trim()),
    Boolean(project.summary.trim()),
    project.preliminaryScope.length > 0,
    project.needsProgram.length > 0,
    project.timeline.length > 0,
    Boolean(project.estimatedBudget.trim()),
    project.team.length > 0,
    project.pending.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function migrateProject(input: unknown): ProjectMasterRecord {
  if (!input || typeof input !== "object") {
    throw new Error("O arquivo não contém um cadastro de projeto válido.");
  }
  const candidate = input as Partial<ProjectMasterRecord>;
  if (!candidate.id || !candidate.code || !candidate.title) {
    throw new Error("O JSON não possui os campos obrigatórios id, code e title.");
  }
  if ((candidate.schemaVersion ?? 0) > PROJECT_SCHEMA_VERSION) {
    throw new Error("O arquivo foi criado por uma versão mais recente do CMP.");
  }
  const base = createEmptyProject(candidate.code);
  return {
    ...base,
    ...candidate,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    property: { ...base.property, ...(candidate.property ?? {}) },
    clients: candidate.clients ?? base.clients,
    preliminaryScope: candidate.preliminaryScope ?? [],
    needsProgram: candidate.needsProgram ?? [],
    timeline: candidate.timeline ?? [],
    visits: candidate.visits ?? [],
    documents: candidate.documents ?? [],
    team: candidate.team ?? [],
    decisions: candidate.decisions ?? [],
    pending: candidate.pending ?? [],
    history: candidate.history ?? base.history,
  };
}
