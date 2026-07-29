import { APPLICATION_ID, PROJECT_SCHEMA_VERSION, ProjectMasterRecord, createHistoryEvent, createId } from "../domain/project-master-record";
import { migrateProject } from "../domain/project-migrations";
import { importEnvelopeSchema } from "../domain/project-schemas";

export interface ExportEnvelope {
  schemaVersion: number; exportedAt: string; application: typeof APPLICATION_ID;
  project: ProjectMasterRecord;
}
export type ImportConflict = "none" | "id" | "code" | "both";
export function exportProject(project: ProjectMasterRecord): ExportEnvelope {
  return {
    schemaVersion: project.schemaVersion, exportedAt: new Date().toISOString(),
    application: APPLICATION_ID,
    project: { ...project, history: [...project.history, createHistoryEvent("exported", "Cadastro exportado em JSON.")] },
  };
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
