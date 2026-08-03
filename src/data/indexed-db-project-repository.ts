import { PROJECT_SCHEMA_VERSION, ProjectMasterRecord, pilotProject } from "../domain/project-master-record";
import { migrateProject } from "../domain/project-migrations";
import { projectMasterRecordSchema } from "../domain/project-schemas";
import { ParametricEnvironmentStudy } from "../features/cap/domain/cap-library-types";
import { parametricEnvironmentStudySchema } from "../features/cap/domain/cap-library-schema";
import { ProjectRepository } from "./project-repository";
import {
  CAP_STUDY_STORE_NAME, PROJECT_STORE_NAME, openThOsDatabase, requestResult, transactionDone,
} from "./th-os-database";

export { DB_NAME, PROJECT_STORE_NAME as STORE_NAME } from "./th-os-database";

export class IndexedDbProjectRepository implements ProjectRepository {
  async list() {
    const database = await openThOsDatabase();
    const transaction = database.transaction(PROJECT_STORE_NAME, "readonly");
    const raw = await requestResult(transaction.objectStore(PROJECT_STORE_NAME).getAll());
    const records = raw.map(migrateProject);
    return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async get(id: string) {
    const database = await openThOsDatabase();
    const transaction = database.transaction(PROJECT_STORE_NAME, "readonly");
    const raw = await requestResult(transaction.objectStore(PROJECT_STORE_NAME).get(id));
    return raw ? migrateProject(raw) : undefined;
  }
  async save(project: ProjectMasterRecord) {
    const primary = project.clients.filter((client) => client.primary);
    if (primary.length > 1) throw new Error("Apenas um cliente pode ser o contato principal.");
    const parsed = projectMasterRecordSchema.parse({
      ...project, schemaVersion: PROJECT_SCHEMA_VERSION, updatedAt: new Date().toISOString(),
    });
    const database = await openThOsDatabase();
    const transaction = database.transaction(PROJECT_STORE_NAME, "readwrite");
    transaction.objectStore(PROJECT_STORE_NAME).put(parsed);
    await transactionDone(transaction);
    return parsed;
  }
  async replaceAll(projects: ProjectMasterRecord[]) {
    const parsed = projects.map((project) => projectMasterRecordSchema.parse(migrateProject(project)));
    const ids = new Set<string>(); const codes = new Set<string>();
    for (const project of parsed) {
      if (ids.has(project.id) || codes.has(project.code)) {
        throw new Error("O backup contém projetos com ID ou código duplicado.");
      }
      ids.add(project.id); codes.add(project.code);
    }
    const database = await openThOsDatabase();
    const transaction = database.transaction(PROJECT_STORE_NAME, "readwrite");
    const store = transaction.objectStore(PROJECT_STORE_NAME);
    store.clear();
    for (const project of parsed) store.put(project);
    await transactionDone(transaction);
    return parsed.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async restoreAll(projects: ProjectMasterRecord[], studies: ParametricEnvironmentStudy[]) {
    const parsedProjects = projects.map((project) => projectMasterRecordSchema.parse(migrateProject(project)));
    const parsedStudies = studies.map((study) => parametricEnvironmentStudySchema.parse(study));
    const projectIds = new Set(parsedProjects.map((project) => project.id));
    if (parsedStudies.some((study) => !projectIds.has(study.projectId))) {
      throw new Error("O backup contém estudo sem projeto correspondente.");
    }
    const database = await openThOsDatabase();
    const transaction = database.transaction([PROJECT_STORE_NAME, CAP_STUDY_STORE_NAME], "readwrite");
    const projectStore = transaction.objectStore(PROJECT_STORE_NAME); const studyStore = transaction.objectStore(CAP_STUDY_STORE_NAME);
    projectStore.clear(); studyStore.clear();
    for (const project of parsedProjects) projectStore.put(project);
    for (const study of parsedStudies) studyStore.put(study);
    await transactionDone(transaction);
    return { projects: parsedProjects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), studies: parsedStudies };
  }
  async remove(id: string) {
    const database = await openThOsDatabase();
    const transaction = database.transaction([PROJECT_STORE_NAME, CAP_STUDY_STORE_NAME], "readwrite");
    transaction.objectStore(PROJECT_STORE_NAME).delete(id);
    const studyStore = transaction.objectStore(CAP_STUDY_STORE_NAME);
    const studyIds = await requestResult(studyStore.index("projectId").getAllKeys(id));
    for (const studyId of studyIds) studyStore.delete(studyId);
    await transactionDone(transaction);
  }
  async nextCode(year = new Date().getFullYear()) {
    const prefix = `TH-${year}-`;
    const highest = (await this.list()).map((item) => item.code)
      .filter((code) => code.startsWith(prefix)).map((code) => Number(code.slice(prefix.length)))
      .filter(Number.isFinite).reduce((max, value) => Math.max(max, value), 0);
    return `${prefix}${String(highest + 1).padStart(3, "0")}`;
  }
  async ensurePilot() {
    const database = await openThOsDatabase();
    const transaction = database.transaction(PROJECT_STORE_NAME, "readonly");
    const raw = await requestResult(transaction.objectStore(PROJECT_STORE_NAME).get(pilotProject.id)) as { schemaVersion?: number } | undefined;
    if (!raw || (raw.schemaVersion ?? 1) < PROJECT_SCHEMA_VERSION) await this.save(pilotProject);
  }
}
