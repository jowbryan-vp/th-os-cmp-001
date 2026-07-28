"use client";

import {
  PROJECT_SCHEMA_VERSION,
  ProjectMasterRecord,
  pilotProject,
} from "../domain/project-master-record";

const DB_NAME = "th-os";
const DB_VERSION = 1;
const STORE_NAME = "project-master-records";

export interface ProjectRepository {
  list(): Promise<ProjectMasterRecord[]>;
  get(id: string): Promise<ProjectMasterRecord | undefined>;
  save(project: ProjectMasterRecord): Promise<ProjectMasterRecord>;
  remove(id: string): Promise<void>;
  nextCode(year?: number): Promise<string>;
  ensurePilot(): Promise<void>;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export class IndexedDbProjectRepository implements ProjectRepository {
  private databasePromise: Promise<IDBDatabase> | null = null;

  private open() {
    if (this.databasePromise) return this.databasePromise;
    this.databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("code", "code", { unique: true });
          store.createIndex("status", "status", { unique: false });
          store.createIndex("updatedAt", "updatedAt", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.databasePromise;
  }

  async list() {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, "readonly");
    const records = await requestResult(
      transaction.objectStore(STORE_NAME).getAll() as IDBRequest<ProjectMasterRecord[]>,
    );
    return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string) {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, "readonly");
    return requestResult(
      transaction.objectStore(STORE_NAME).get(id) as IDBRequest<
        ProjectMasterRecord | undefined
      >,
    );
  }

  async save(project: ProjectMasterRecord) {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const record = {
      ...project,
      schemaVersion: PROJECT_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
    };
    transaction.objectStore(STORE_NAME).put(record);
    await transactionDone(transaction);
    return record;
  }

  async remove(id: string) {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    await transactionDone(transaction);
  }

  async nextCode(year = new Date().getFullYear()) {
    const records = await this.list();
    const prefix = `TH-${year}-`;
    const highest = records
      .map((record) => record.code)
      .filter((code) => code.startsWith(prefix))
      .map((code) => Number(code.slice(prefix.length)))
      .filter(Number.isFinite)
      .reduce((current, value) => Math.max(current, value), 0);
    return `${prefix}${String(highest + 1).padStart(3, "0")}`;
  }

  async ensurePilot() {
    const existing = await this.get(pilotProject.id);
    if (!existing) await this.save(pilotProject);
  }
}

let repository: ProjectRepository | null = null;

export function getProjectRepository(): ProjectRepository {
  if (!repository) repository = new IndexedDbProjectRepository();
  return repository;
}
