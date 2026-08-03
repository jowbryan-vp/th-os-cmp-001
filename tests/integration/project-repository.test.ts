import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import { IndexedDbProjectRepository } from "../../src/data/indexed-db-project-repository";
import { createEmptyProject } from "../../src/domain/project-master-record";

test("IndexedDB repository supports CRUD, ordering, uniqueness, archive and single seed", async () => {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase("th-os");
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
  const repository = new IndexedDbProjectRepository();
  await repository.ensurePilot(); await repository.ensurePilot();
  assert.equal((await repository.list()).filter((item) => item.id === "project-th-2026-001").length, 1);
  const first = createEmptyProject("TH-2026-002", "2026-01-01T00:00:00.000Z");
  first.internalName = "Primeiro"; const saved = await repository.save(first);
  assert.equal((await repository.get(saved.id))?.internalName, "Primeiro");
  const updated = await repository.save({ ...saved, internalName: "Atualizado", recordStatus: "archived", archivedAt: new Date().toISOString() });
  assert.equal(updated.recordStatus, "archived");
  assert.equal((await repository.list())[0]?.id, updated.id);
  const duplicate = { ...createEmptyProject("TH-2026-002"), id: "duplicate-id" };
  await assert.rejects(() => repository.save(duplicate));
  assert.equal(await repository.nextCode(2026), "TH-2026-003");
  const restored = createEmptyProject("TH-2030-001", "2030-01-01T00:00:00.000Z");
  const replacement = await repository.replaceAll([restored]);
  assert.equal(replacement.length, 1);
  assert.equal((await repository.list())[0]?.code, "TH-2030-001");
  await assert.rejects(() => repository.replaceAll([restored, { ...restored, id: "duplicate-restored" }]));
  assert.equal((await repository.list())[0]?.code, "TH-2030-001");
  await repository.remove(updated.id);
  assert.equal(await repository.get(updated.id), undefined);
});
