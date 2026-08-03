import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import { resetDatabaseConnectionForTests } from "../../src/data/th-os-database";
import { ReferenceCatalogRepository } from "../../src/features/catalogs/repositories/reference-catalog-repository";

test("catálogo semeia Rondônia, cria opções e evita duplicatas por acento e caixa", async () => {
  await new Promise<void>((resolve) => { const request = indexedDB.deleteDatabase("th-os"); request.onsuccess = () => resolve(); });
  resetDatabaseConnectionForTests(); const repository = new ReferenceCatalogRepository();
  assert.ok((await repository.listByType("state")).some((v) => v.value === "RO"));
  assert.ok((await repository.listByType("city")).some((v) => v.value === "Ji-Paraná"));
  const first = await repository.create("city", "Nova Cidade");
  const duplicate = await repository.create("city", "  nova CIDADE  ");
  assert.equal(duplicate.id, first.id);
  await repository.deactivate(first.id);
  assert.equal((await repository.listByType("city")).some((v) => v.id === first.id), false);
  await repository.restore(first.id);
  assert.equal((await repository.search("city", "nova")).some((v) => v.id === first.id), true);
});
