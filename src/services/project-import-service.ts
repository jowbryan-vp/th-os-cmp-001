import { APPLICATION_ID, PROJECT_SCHEMA_VERSION, ProjectMasterRecord, createHistoryEvent, createId } from "../domain/project-master-record";
import { migrateProject } from "../domain/project-migrations";
import { backupEnvelopeSchema, importEnvelopeSchema } from "../domain/project-schemas";

export interface ExportEnvelope {
  schemaVersion: number; exportedAt: string; application: typeof APPLICATION_ID;
  project: ProjectMasterRecord;
}
export interface ConsolidatedBackupEnvelope {
  kind: "consolidated-backup"; schemaVersion: number; exportedAt: string;
  application: typeof APPLICATION_ID; projects: ProjectMasterRecord[];
}
export type ImportConflict = "none" | "id" | "code" | "both";
export function exportProject(project: ProjectMasterRecord): ExportEnvelope {
  return {
    schemaVersion: project.schemaVersion, exportedAt: new Date().toISOString(),
    application: APPLICATION_ID,
    project: { ...project, history: [...project.history, createHistoryEvent("exported", "Cadastro exportado em JSON.")] },
  };
}
export function exportConsolidatedBackup(projects: ProjectMasterRecord[]): ConsolidatedBackupEnvelope {
  return {
    kind: "consolidated-backup", schemaVersion: PROJECT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(), application: APPLICATION_ID,
    projects: projects.map((project) => ({
      ...project,
      history: [...project.history, createHistoryEvent("exported", "Incluído em backup consolidado.")],
    })),
  };
}
export function parseConsolidatedBackup(input: unknown): ProjectMasterRecord[] {
  const envelope = backupEnvelopeSchema.parse(input);
  if (envelope.schemaVersion > PROJECT_SCHEMA_VERSION) {
    throw new Error("O backup foi criado por uma versão futura do CMP.");
  }
  const projects = envelope.projects.map(migrateProject);
  const ids = new Set<string>(); const codes = new Set<string>();
  for (const project of projects) {
    if (ids.has(project.id) || codes.has(project.code)) {
      throw new Error("O backup contém projetos com ID ou código duplicado.");
    }
    ids.add(project.id); codes.add(project.code);
  }
  return projects;
}
export function parseProjectImport(input: unknown) {
  const envelope = importEnvelopeSchema.safeParse(input);
  if (envelope.success && envelope.data.schemaVersion > PROJECT_SCHEMA_VERSION) {
    throw new Error("O arquivo foi criado por uma versão futura do CMP.");
  }
  return migrateProject(envelope.success ? envelope.data.project : input);
}
export function detectImportConflict(project: ProjectMasterRecord, existing: ProjectMasterRecord[]): ImportConflict {
  const id = existing.some((item) => item.id === project.id);
  const code = existing.some((item) => item.code === project.code && item.id !== project.id);
  return id && code ? "both" : id ? "id" : code ? "code" : "none";
}
export function importAsNew(project: ProjectMasterRecord, code: string): ProjectMasterRecord {
  return {
    ...project, id: createId("project"), code, recordStatus: "draft", archivedAt: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    history: [...project.history, createHistoryEvent("imported", `Importado como novo; código original ${project.code}.`)],
  };
}
