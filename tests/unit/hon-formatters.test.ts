import assert from "node:assert/strict";
import test from "node:test";
import { domainErrorMessage, inputMoney, money, parseMoney } from "../../src/features/hon/components/hon-formatters";

test("money formata centavos como moeda pt-BR", () => {
  assert.equal(money(640404), "R$ 6.404,04");
  assert.equal(money(0), "R$ 0,00");
});

test("parseMoney/inputMoney fazem a volta com vírgula decimal", () => {
  assert.equal(parseMoney("2.000,00"), 200_000);
  assert.equal(inputMoney(200_000), "2.000,00");
});

test("domainErrorMessage repassa mensagem verbatim quando está na lista conhecida", () => {
  const known = ["O imposto deve estar entre 0% e 100%."];
  const reason = new Error("O imposto deve estar entre 0% e 100%.");
  assert.equal(domainErrorMessage(reason, known, "mensagem genérica"), "O imposto deve estar entre 0% e 100%.");
});

test("domainErrorMessage esconde mensagem técnica de erro desconhecido atrás do fallback genérico", () => {
  const known = ["O imposto deve estar entre 0% e 100%."];
  const technical = new TypeError("Cannot read properties of undefined (reading 'foo')");
  assert.equal(domainErrorMessage(technical, known, "Não foi possível calcular os honorários com os dados atuais."), "Não foi possível calcular os honorários com os dados atuais.");
});

test("domainErrorMessage trata rejeição não-Error (string, undefined) com o fallback genérico", () => {
  assert.equal(domainErrorMessage("boom", [], "fallback"), "fallback");
  assert.equal(domainErrorMessage(undefined, [], "fallback"), "fallback");
});

test("domainErrorMessage com lista vazia nunca repassa a mensagem original, mesmo sendo um Error legítimo", () => {
  const reason = new Error("Estudo não encontrado.");
  assert.equal(domainErrorMessage(reason, [], "Não foi possível salvar o estudo neste dispositivo. Tente novamente."), "Não foi possível salvar o estudo neste dispositivo. Tente novamente.");
});
