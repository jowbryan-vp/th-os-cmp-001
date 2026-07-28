import { ProjectMasterRecord, createHistoryEvent, createId } from "../domain/project-master-record";

export function changeArchiveState(project: ProjectMasterRecord, archive: boolean): ProjectMasterRecord {
  return {
    ...project, recordStatus: archive ? "archived" : "active",
    projectPhase: archive ? "archived" : project.projectPhase === "archived" ? "pre_service" : project.projectPhase,
    archivedAt: archive ? new Date().toISOString() : null,
    history: [...project.history, createHistoryEvent(archive ? "archived" : "restored", project.code)],
  };
}
export function duplicateProject(project: ProjectMasterRecord, code: string): ProjectMasterRecord {
  const now = new Date().toISOString();
  return {
    ...structuredClone(project), id: createId("project"), code,
    internalName: `${project.internalName} — cópia`, recordStatus: "draft",
    archivedAt: null, createdAt: now, updatedAt: now,
    history: [createHistoryEvent("duplicated", `Criado a partir de ${project.code}.`, now)],
  };
}
