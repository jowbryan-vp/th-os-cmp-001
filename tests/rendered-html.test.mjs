import assert from "node:assert/strict";
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

test("server-renders the TH Arquitetura contract interface", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>TH Arquitetura \| Contratos<\/title>/i);
  assert.match(html, /Projeto residencial/);
  assert.match(html, /Contratante e projeto/);
  assert.match(html, /Escopo contratado/);
  assert.match(html, /Etapas e prazos/);
  assert.match(html, /Honorários/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});
