import assert from "node:assert/strict";
import test from "node:test";
import { formatPtBrDecimal, isValidPositiveDimension, parsePtBrDecimal } from "../../src/utils/pt-br-decimal";

test("parseia decimais pt-BR com vírgula, ponto e vazio sem produzir zero silencioso", () => {
  assert.equal(parsePtBrDecimal("0,60"), 0.6);
  assert.equal(parsePtBrDecimal("1.60"), 1.6);
  assert.equal(parsePtBrDecimal(""), null);
  assert.equal(parsePtBrDecimal("incompleto"), null);
  assert.equal(parsePtBrDecimal("-1,2"), -1.2);
  assert.equal(isValidPositiveDimension(0), false);
  assert.equal(isValidPositiveDimension(-1), false);
  assert.equal(isValidPositiveDimension(0.6), true);
  assert.equal(formatPtBrDecimal(1.6), "1,6");
});
