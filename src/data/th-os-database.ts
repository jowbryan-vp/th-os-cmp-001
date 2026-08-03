export const DB_NAME = "th-os";
export const PROJECT_STORE_NAME = "project-master-records";
export const CAP_STUDY_STORE_NAME = "parametric-studies";
export const DB_VERSION = 3;

let databasePromise: Promise<IDBDatabase> | null = null;
export const requestResult = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
});
export const transactionDone = (transaction: IDBTransaction) => new Promise<void>((resolve, reject) => {
  transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error);
  transaction.onabort = () => reject(transaction.error);
});
export function openThOsDatabase() {
  databasePromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      const projectStore = database.objectStoreNames.contains(PROJECT_STORE_NAME)
        ? request.transaction!.objectStore(PROJECT_STORE_NAME)
        : database.createObjectStore(PROJECT_STORE_NAME, { keyPath: "id" });
      if (!projectStore.indexNames.contains("code")) projectStore.createIndex("code", "code", { unique: true });
      if (!projectStore.indexNames.contains("recordStatus")) projectStore.createIndex("recordStatus", "recordStatus");
      if (!projectStore.indexNames.contains("updatedAt")) projectStore.createIndex("updatedAt", "updatedAt");
      const studyStore = database.objectStoreNames.contains(CAP_STUDY_STORE_NAME)
        ? request.transaction!.objectStore(CAP_STUDY_STORE_NAME)
        : database.createObjectStore(CAP_STUDY_STORE_NAME, { keyPath: "id" });
      if (!studyStore.indexNames.contains("projectId")) studyStore.createIndex("projectId", "projectId");
      if (!studyStore.indexNames.contains("status")) studyStore.createIndex("status", "status");
      if (!studyStore.indexNames.contains("updatedAt")) studyStore.createIndex("updatedAt", "updatedAt");
    };
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  return databasePromise;
}
export function resetDatabaseConnectionForTests() { databasePromise = null; }
