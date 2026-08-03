"use client";

import { createId } from "../../../domain/project-master-record";
import { CATALOG_STORE_NAME, openThOsDatabase, requestResult, transactionDone } from "../../../data/th-os-database";
import { CatalogOption, ReferenceCatalog, catalogOptionSchema, normalizeCatalogValue, referenceCatalogPresets } from "../domain/reference-catalog";

export class ReferenceCatalogRepository {
  private async seed() {
    const database = await openThOsDatabase();
    const transaction = database.transaction(CATALOG_STORE_NAME, "readwrite");
    const store = transaction.objectStore(CATALOG_STORE_NAME);
    const count = await requestResult(store.count());
    if (!count) for (const option of referenceCatalogPresets) store.put(option);
    await transactionDone(transaction);
  }
  async list() { await this.seed(); const database = await openThOsDatabase(); return (await requestResult(database.transaction(CATALOG_STORE_NAME).objectStore(CATALOG_STORE_NAME).getAll()) as CatalogOption[]).map((v) => catalogOptionSchema.parse(v)); }
  async listByType(type: ReferenceCatalog, projectId: string | null = null) {
    const values = (await this.list()).filter((v) => v.catalogType === type && v.active && (!v.projectId || v.projectId === projectId));
    return values.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, "pt-BR"));
  }
  async search(type: ReferenceCatalog, query: string, projectId: string | null = null) { const key = normalizeCatalogValue(query); return (await this.listByType(type, projectId)).filter((v) => normalizeCatalogValue(v.label).includes(key)); }
  async resolve(type: ReferenceCatalog, value: string, projectId: string | null = null) { const key = normalizeCatalogValue(value); return (await this.listByType(type, projectId)).find((v) => normalizeCatalogValue(v.value) === key); }
  async create(type: ReferenceCatalog, label: string, projectId: string | null = null, parentId: string | null = null) {
    const clean = label.trim().replace(/\s+/g, " "); if (!clean) throw new Error("Informe um nome para a opção.");
    const key = normalizeCatalogValue(clean);
    const duplicate = (await this.list()).find((option) => option.catalogType === type && option.projectId === projectId
      && normalizeCatalogValue(option.value) === key);
    if (duplicate) return duplicate.active ? duplicate : this.update({ ...duplicate, active: true });
    const siblings = await this.listByType(type, projectId); const timestamp = new Date().toISOString();
    const option = catalogOptionSchema.parse({ id: createId("catalog"), catalogType: type, value: clean, label: clean, active: true,
      system: false, order: siblings.length, createdAt: timestamp, updatedAt: timestamp, parentId, projectId });
    const database = await openThOsDatabase(); const transaction = database.transaction(CATALOG_STORE_NAME, "readwrite");
    transaction.objectStore(CATALOG_STORE_NAME).put(option); await transactionDone(transaction); return option;
  }
  async update(option: CatalogOption) { const parsed = catalogOptionSchema.parse({ ...option, updatedAt: new Date().toISOString() }); const database = await openThOsDatabase(); const transaction = database.transaction(CATALOG_STORE_NAME, "readwrite"); transaction.objectStore(CATALOG_STORE_NAME).put(parsed); await transactionDone(transaction); return parsed; }
  async deactivate(id: string) { const option = (await this.list()).find((v) => v.id === id); if (!option || option.system) return option; return this.update({ ...option, active: false }); }
  async restore(id: string) { const option = (await this.list()).find((v) => v.id === id); return option ? this.update({ ...option, active: true }) : undefined; }
}

let repository: ReferenceCatalogRepository | null = null;
export function getReferenceCatalogRepository() { repository ??= new ReferenceCatalogRepository(); return repository; }
