import {
  PROJECT_SCHEMA_VERSION, ProjectMasterRecord, createEmptyProject, createHistoryEvent,
  createScopeItem, pilotProject,
} from "./project-master-record";
import { projectMasterRecordSchema } from "./project-schemas";

type Legacy = Record<string, unknown>;
const text = (value: unknown) => typeof value === "string" ? value : "";
const numberOrNull = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const normalized = Number(value.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(normalized) ? normalized : null;
  }
  return null;
};

export function migrateV1ToV2(source: Legacy): ProjectMasterRecord {
  if (source.id === pilotProject.id) return structuredClone(pilotProject);
  const base = createEmptyProject(text(source.code));
  const property = (source.property ?? {}) as Legacy;
  const clients = Array.isArray(source.clients) ? source.clients as Legacy[] : [];
  const scope = Array.isArray(source.preliminaryScope) ? source.preliminaryScope : [];
  return {
    ...base,
    id: text(source.id), code: text(source.code),
    internalName: text(source.title) || "Projeto sem nome",
    recordStatus: source.status === "archived" ? "archived" : source.status === "active" ? "active" : "draft",
    projectPhase: "pre_service", createdAt: text(source.createdAt) || base.createdAt,
    updatedAt: text(source.updatedAt) || base.updatedAt,
    archivedAt: typeof source.archivedAt === "string" ? source.archivedAt : null,
    initialSynthesis: text(source.summary),
    context: { ...base.context, requestSummary: text(source.context), objectives: text(source.objectives) },
    property: {
      ...base.property, type: text(property.typology), city: text(property.city),
      state: text(property.state), address: text(property.address), postalCode: text(property.postalCode),
      existingBuiltAreaM2: numberOrNull(property.area), occupancy: text(property.occupancy),
      constraints: text(property.constraints),
    },
    clients: clients.length ? clients.map((client, index) => ({
      ...base.clients[0], id: text(client.id) || `client-migrated-${index}`,
      name: text(client.name), email: text(client.email), phone: text(client.phone),
      projectRole: text(client.role) || "Cliente", primary: Boolean(client.primary ?? index === 0),
    })) : base.clients,
    preliminaryScope: scope.map((item, index) =>
      createScopeItem(typeof item === "string" ? item : `legacy-${index}`, "under_review", index)),
    needsProgram: [], planning: base.planning,
    timeline: [], budget: { ...base.budget, notes: text(source.budgetNotes) },
    visits: [], documents: [], team: [], decisions: [], pending: [],
    history: [createHistoryEvent("imported", "Registro migrado do schema v1 para v2.")],
  };
}

export function migrateProject(input: unknown): ProjectMasterRecord {
  if (!input || typeof input !== "object") throw new Error("O arquivo não contém um projeto válido.");
  const source = input as Legacy;
  const version = Number(source.schemaVersion ?? 1);
  if (version > PROJECT_SCHEMA_VERSION) throw new Error("O arquivo foi criado por uma versão futura do CMP.");
  const migrated = version === 1 ? migrateV1ToV2(source) : source;
  const parsed = projectMasterRecordSchema.safeParse(migrated);
  if (!parsed.success) throw new Error(`Projeto inválido: ${parsed.error.issues[0]?.message ?? "schema incompatível"}`);
  const primary = parsed.data.clients.filter((client) => client.primary);
  if (primary.length > 1) throw new Error("O projeto possui mais de um contato principal.");
  return parsed.data;
}
