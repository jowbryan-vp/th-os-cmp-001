import { PROJECT_SCHEMA_VERSION, ProjectMasterRecord, pilotProject } from "../domain/project-master-record";
import { migrateProject } from "../domain/project-migrations";
import { projectMasterRecordSchema } from "../domain/project-schemas";
import { ProjectRepository } from "./project-repository";

export const DB_NAME = "th-os";
export const STORE_NAME = "project-master-records";
const DB_VERSION = 2;
const result = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
const done = (transaction: IDBTransaction) => new Promise<void>((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onerror = () => reject(transaction.error);
  transaction.onabort = () => reject(transaction.error);
});

export class IndexedDbProjectRepository implements ProjectRepository {
  private databasePromise: Promise<IDBDatabase> | null = null;
  private open() {
    this.databasePromise ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        const store = database.objectStoreNames.contains(STORE_NAME)
          ? request.transaction!.objectStore(STORE_NAME)
          : database.createObjectStore(STORE_NAME, { keyPath: "id" });
        if (!store.indexNames.contains("code")) store.createIndex("code", "code", { unique: true });
        if (!store.indexNames.contains("recordStatus")) store.createIndex("recordStatus", "recordStatus");
        if (!store.indexNames.contains("updatedAt")) store.createIndex("updatedAt", "updatedAt");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.databasePromise;
  }
  async list() {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, "readonly");
    const raw = await result(transaction.objectStore(STORE_NAME).getAll());
    const records = raw.map(migrateProject);
    return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async get(id: string) {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, "readonly");
    const raw = await result(transaction.objectStore(STORE_NAME).get(id));
    return raw ? migrateProject(raw) : undefined;
  }
  async save(project: ProjectMasterRecord) {
    const primary = project.clients.filter((client) => client.primary);
    if (primary.length > 1) throw new Error("Apenas um cliente pode ser o contato principal.");
    const parsed = projectMasterRecordSchema.parse({
      ...project, schemaVersion: PROJECT_SCHEMA_VERSION, updatedAt: new Date().toISOString(),
    });
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(parsed);
    await done(transaction);
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
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    for (const project of parsed) store.put(project);
    await done(transaction);
    return parsed.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async remove(id: string) {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    await done(transaction);
  }
  async nextCode(year = new Date().getFullYear()) {
    const prefix = `TH-${year}-`;
    const highest = (await this.list()).map((item) => item.code)
      .filter((code) => code.startsWith(prefix)).map((code) => Number(code.slice(prefix.length)))
      .filter(Number.isFinite).reduce((max, value) => Math.max(max, value), 0);
    return `${prefix}${String(highest + 1).padStart(3, "0")}`;
  }
  async ensurePilot() {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, "readonly");
    const raw = await result(transaction.objectStore(STORE_NAME).get(pilotProject.id)) as { schemaVersion?: number } | undefined;
    if (!raw || (raw.schemaVersion ?? 1) < PROJECT_SCHEMA_VERSION) await this.save(pilotProject);
  }
}
