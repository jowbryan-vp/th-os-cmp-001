import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the TH OS Cadastro Mestre interface", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Cadastro Mestre do Projeto \| TH OS<\/title>/i);
  assert.match(html, /Cadastro Mestre do Projeto/);
  assert.match(html, /CMP-001/);
  assert.match(html, /TH-2026-001/);
  assert.match(html, /Novo projeto/);
  assert.doesNotMatch(html, /Emitir contrato|Honorários|TH-2026-014/i);
});

test("domain and repository expose the required CMP contracts", async () => {
  const domain = await readFile(
    new URL("../src/domain/project-master-record.ts", import.meta.url),
    "utf8",
  );
  const repository = await readFile(
    new URL("../src/data/project-repository.ts", import.meta.url),
    "utf8",
  );

  assert.match(domain, /interface ProjectMasterRecord/);
  assert.match(domain, /PROJECT_SCHEMA_VERSION/);
  assert.match(domain, /TH-2026-001/);
  assert.match(domain, /validateProject/);
  assert.match(domain, /calculateProjectProgress/);
  assert.match(repository, /interface ProjectRepository/);
  assert.match(repository, /class IndexedDbProjectRepository/);
  assert.match(repository, /project-master-records/);
});
