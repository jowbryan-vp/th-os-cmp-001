import assert from "node:assert/strict";
import test from "node:test";
import {
  migrateFeeScenario, migrateFeeServiceInput, migrateFeeSnapshot, migrateFeeStudy,
} from "../../src/features/hon/domain/hon-migrations";

function legacyService(patch: Record<string, unknown> = {}) {
  return {
    id: "fee-service-1", catalogItemId: "service-cadastral_survey", code: "cadastral_survey",
    name: "Levantamento cadastral", stage: "levantamento", estimatedHours: 12, hourlyCostCents: null,
    fixedCostCents: 0, minimumValueCents: 0, included: true, notes: "calibrado",
    ...patch,
  };
}

test("migrateFeeServiceInput preenche category/displayOrder pelo conteúdo curado do código reconhecido", () => {
  const migrated = migrateFeeServiceInput(legacyService()) as Record<string, unknown>;
  assert.equal(migrated.category, "diagnosis");
  assert.equal(typeof migrated.displayOrder, "number");
});

test("migrateFeeServiceInput deriva commercialState de included=true legado e recomputa os três booleanos", () => {
  const migrated = migrateFeeServiceInput(legacyService({ included: true })) as Record<string, unknown>;
  assert.equal(migrated.commercialState, "included");
  assert.equal(migrated.included, true);
  assert.equal(migrated.optional, false);
  assert.equal(migrated.complimentary, false);
});

test("migrateFeeServiceInput deriva commercialState de included=false legado como not_contracted", () => {
  const migrated = migrateFeeServiceInput(legacyService({ included: false })) as Record<string, unknown>;
  assert.equal(migrated.commercialState, "not_contracted");
  assert.equal(migrated.included, false);
});

test("migrateFeeServiceInput preenche quantity=1 e individualDiscountCents=0 quando ausentes", () => {
  const migrated = migrateFeeServiceInput(legacyService()) as Record<string, unknown>;
  assert.equal(migrated.quantity, 1);
  assert.equal(migrated.individualDiscountCents, 0);
  assert.equal(migrated.customDescription, null);
});

test("migrateFeeServiceInput preserva id/code/name/estimatedHours/catalogItemId/notes do registro antigo", () => {
  const migrated = migrateFeeServiceInput(legacyService()) as Record<string, unknown>;
  assert.equal(migrated.id, "fee-service-1");
  assert.equal(migrated.code, "cadastral_survey");
  assert.equal(migrated.catalogItemId, "service-cadastral_survey");
  assert.equal(migrated.estimatedHours, 12);
  assert.equal(migrated.notes, "calibrado");
});

test("migrateFeeServiceInput é idempotente: migrar duas vezes não altera nada", () => {
  const once = migrateFeeServiceInput(legacyService());
  const twice = migrateFeeServiceInput(once);
  assert.deepEqual(once, twice);
});

test("migrateFeeServiceInput nunca sobrescreve commercialState/quantity/desconto já presentes", () => {
  const alreadyMigrated = legacyService({
    commercialState: "optional", included: false, optional: true, complimentary: false,
    quantity: 3, individualDiscountCents: 1_500, category: "legal", displayOrder: 42,
  });
  const migrated = migrateFeeServiceInput(alreadyMigrated) as Record<string, unknown>;
  assert.equal(migrated.commercialState, "optional");
  assert.equal(migrated.quantity, 3);
  assert.equal(migrated.individualDiscountCents, 1_500);
  assert.equal(migrated.category, "legal");
  assert.equal(migrated.displayOrder, 42);
});

test("migrateFeeServiceInput autocorrige combinação incoerente salva fora do app (booleans divergentes de commercialState)", () => {
  const corrupted = legacyService({
    commercialState: "optional", included: true, optional: true, complimentary: true, // incoerente de propósito
  });
  const migrated = migrateFeeServiceInput(corrupted) as Record<string, unknown>;
  assert.equal(migrated.commercialState, "optional");
  assert.equal(migrated.included, false);
  assert.equal(migrated.optional, true);
  assert.equal(migrated.complimentary, false);
});

test("migrateFeeServiceInput trata commercialState desconhecido/corrompido como not_contracted", () => {
  const corrupted = legacyService({ commercialState: "not-a-real-state", included: false });
  const migrated = migrateFeeServiceInput(corrupted) as Record<string, unknown>;
  assert.equal(migrated.commercialState, "not_contracted");
});

test("migrateFeeServiceInput dá defaults seguros a item personalizado (código desconhecido)", () => {
  const custom = legacyService({ id: "fee-service-custom", code: "custom_drone_survey", catalogItemId: null, included: false });
  const migrated = migrateFeeServiceInput(custom) as Record<string, unknown>;
  assert.equal(migrated.category, "complementary");
  assert.equal(migrated.displayOrder, 9999);
  assert.equal(migrated.customDescription, null);
});

test("migrateFeeStudy migra todos os serviços de um estudo salvo antes do HON-002C", () => {
  const study = { id: "study-1", services: [legacyService(), legacyService({ id: "fee-service-2", included: false })] };
  const migrated = migrateFeeStudy(study) as { services: Array<Record<string, unknown>> };
  assert.equal(migrated.services.length, 2);
  assert.equal(migrated.services[0].commercialState, "included");
  assert.equal(migrated.services[1].commercialState, "not_contracted");
});

test("migrateFeeStudy não quebra quando services já é undefined/ausente (passa o objeto adiante)", () => {
  const raw = { id: "study-1" };
  assert.deepEqual(migrateFeeStudy(raw), raw);
});

test("migrateFeeScenario migra a cópia de services do cenário do mesmo jeito que o estudo", () => {
  const scenario = { id: "scenario-1", services: [legacyService()] };
  const migrated = migrateFeeScenario(scenario) as { services: Array<Record<string, unknown>> };
  assert.equal(migrated.services[0].commercialState, "included");
});

test("migrateFeeSnapshot migra o payload (FeeCalculationStudy completo) embutido no snapshot imutável", () => {
  const snapshot = { id: "snap-1", payload: { id: "study-1", services: [legacyService()] } };
  const migrated = migrateFeeSnapshot(snapshot) as { payload: { services: Array<Record<string, unknown>> } };
  assert.equal(migrated.payload.services[0].commercialState, "included");
});
