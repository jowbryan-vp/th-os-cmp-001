import assert from "node:assert/strict";
import test from "node:test";
import {
  appendCompositionHistory, buildCompositionHistoryEntries, computeCompositionTotals, createCustomService,
  createServiceFromCatalogItem, groupServicesByCategory, serviceCommercialStateLabels, serviceCommercialStateOrder,
  serviceLineGrossCents, serviceLineHours, serviceLineNetCents, withCommercialState,
} from "../../src/features/hon/domain/hon-service-composition";
import { FeeServiceInput, ServiceCatalogItem } from "../../src/features/hon/domain/hon-types";

function service(patch: Partial<FeeServiceInput> = {}): FeeServiceInput {
  return {
    id: "svc-1", catalogItemId: "cat-1", code: "architectural_design", name: "Projeto arquitetônico",
    stage: "projeto", category: "design", displayOrder: 100, estimatedHours: 10, hourlyCostCents: null,
    fixedCostCents: 0, minimumValueCents: 0, commercialState: "included", included: true, optional: false,
    complimentary: false, quantity: 1, individualDiscountCents: 0, customDescription: null, notes: "",
    ...patch,
  };
}

const catalogItem: ServiceCatalogItem = {
  id: "cat-1", version: "1.0.0", code: "architectural_design", name: "Projeto arquitetônico", stage: "projeto",
  category: "design", clientDescription: "desc cliente", technicalDescription: "desc técnica",
  deliverables: ["plantas"], exclusions: ["obra"], assumptions: ["acesso ao imóvel"], displayOrder: 100,
  calculationMethod: "hours", baseHours: 20, minimumHours: 0, unit: "hora", responsible: "Arquiteto",
  execution: "internal", defaultComplexity: "simple", includedRevisionRounds: 0, includedVisits: 0, bim: false,
  risk: "low", minimumValueCents: 5_000, active: true, source: "teste", confidence: "unvalidated", notes: "",
};

test("withCommercialState mantém os três booleanos sempre em sincronia com o enum, sem combinação incoerente", () => {
  for (const state of serviceCommercialStateOrder) {
    const result = withCommercialState(service(), state);
    assert.equal(result.commercialState, state);
    assert.equal(result.included, state === "included");
    assert.equal(result.optional, state === "optional");
    assert.equal(result.complimentary, state === "complimentary");
    // Nunca mais de um boolean verdadeiro ao mesmo tempo.
    assert.ok([result.included, result.optional, result.complimentary].filter(Boolean).length <= 1);
  }
});

test("serviceLineGrossCents multiplica horas e custo fixo por quantidade, nunca a tarifa-hora em si", () => {
  const withQuantity = service({ estimatedHours: 10, quantity: 3, hourlyCostCents: 1_000, fixedCostCents: 500 });
  // (10h * 3) * 1000 + 500 * 3 = 30_000 + 1_500 = 31_500
  assert.equal(serviceLineGrossCents(withQuantity, 9_999), 31_500);
  assert.equal(serviceLineHours(withQuantity), 30);
});

test("serviceLineGrossCents usa a tarifa-hora do escritório quando o serviço não tem tarifa própria", () => {
  const service1 = service({ estimatedHours: 5, quantity: 2, hourlyCostCents: null, fixedCostCents: 0 });
  assert.equal(serviceLineGrossCents(service1, 1_000), 10_000);
});

test("serviceLineNetCents aplica o desconto individual sem nunca ficar negativo", () => {
  const item = service({ estimatedHours: 10, quantity: 1, hourlyCostCents: 1_000, individualDiscountCents: 3_000 });
  assert.equal(serviceLineGrossCents(item, 0), 10_000);
  assert.equal(serviceLineNetCents(item, 0), 7_000);
  const overDiscounted = service({ estimatedHours: 10, quantity: 1, hourlyCostCents: 1_000, individualDiscountCents: 999_999 });
  assert.equal(serviceLineNetCents(overDiscounted, 0), 0, "desconto maior que o bruto zera a linha, nunca fica negativo");
});

test("cortesia é distinta de desconto de 100%: cortesia soma zero ao total incluído, desconto de 100% também zera mas continua contado como incluído", () => {
  const discounted100 = service({ estimatedHours: 10, hourlyCostCents: 1_000, individualDiscountCents: 10_000, commercialState: "included" });
  const complimentary = service({ id: "svc-2", estimatedHours: 10, hourlyCostCents: 1_000, commercialState: "complimentary", included: false, complimentary: true });
  const totals = computeCompositionTotals([discounted100, complimentary], 0);
  assert.equal(totals.includedCents, 0, "desconto de 100% zera o valor, mas a linha continua no total incluído (R$ 0)");
  assert.equal(totals.discountCents, 10_000, "o desconto aplicado é auditável no total de descontos");
  assert.equal(totals.complimentaryCents, 10_000, "cortesia aparece no total de cortesias pelo valor bruto, para transparência");
  assert.equal(totals.contractedCents, 0);
});

test("computeCompositionTotals separa incluído, opcional, cortesia e nunca mistura opcional ao contratado", () => {
  const included = service({ id: "s1", commercialState: "included", estimatedHours: 10, hourlyCostCents: 1_000 });
  const optional = service({ id: "s2", commercialState: "optional", included: false, optional: true, estimatedHours: 5, hourlyCostCents: 1_000 });
  const complimentary = service({ id: "s3", commercialState: "complimentary", included: false, complimentary: true, estimatedHours: 2, hourlyCostCents: 1_000 });
  const notContracted = service({ id: "s4", commercialState: "not_contracted", included: false, estimatedHours: 100, hourlyCostCents: 1_000 });
  const totals = computeCompositionTotals([included, optional, complimentary, notContracted], 0);
  assert.equal(totals.includedCents, 10_000);
  assert.equal(totals.optionalCents, 5_000);
  assert.equal(totals.complimentaryCents, 2_000);
  assert.equal(totals.contractedCents, 10_000, "total contratado é só o incluído — opcional e não contratado nunca entram");
});

test("groupServicesByCategory ordena por serviceCategoryOrder, depois displayOrder, depois nome", () => {
  const groups = groupServicesByCategory([
    service({ id: "s1", category: "complementary", displayOrder: 200, name: "Zebra" }),
    service({ id: "s2", category: "diagnosis", displayOrder: 200, name: "Bravo" }),
    service({ id: "s3", category: "diagnosis", displayOrder: 100, name: "Alfa" }),
  ], 0);
  assert.deepEqual(groups.map((g) => g.category), ["diagnosis", "complementary"]);
  assert.deepEqual(groups[0].services.map((s) => s.name), ["Alfa", "Bravo"]);
});

test("groupServicesByCategory calcula subtotal por categoria só com serviços incluídos", () => {
  const groups = groupServicesByCategory([
    service({ id: "s1", category: "design", commercialState: "included", estimatedHours: 10, hourlyCostCents: 1_000 }),
    service({ id: "s2", category: "design", commercialState: "optional", included: false, optional: true, estimatedHours: 10, hourlyCostCents: 1_000 }),
  ], 0);
  assert.equal(groups[0].subtotalCents, 10_000);
});

test("createServiceFromCatalogItem entra como não contratado (estado neutro), preservando category/displayOrder/minimumValueCents do catálogo", () => {
  const created = createServiceFromCatalogItem(catalogItem);
  assert.equal(created.catalogItemId, "cat-1");
  assert.equal(created.commercialState, "not_contracted");
  assert.equal(created.included, false);
  assert.equal(created.category, "design");
  assert.equal(created.displayOrder, 100);
  assert.equal(created.minimumValueCents, 5_000);
  assert.equal(created.quantity, 1);
  assert.equal(created.individualDiscountCents, 0);
});

test("createCustomService não tem catalogItemId e usa defaults seguros de categoria/displayOrder", () => {
  const created = createCustomService();
  assert.equal(created.catalogItemId, null);
  assert.equal(created.category, "complementary");
  assert.equal(created.displayOrder, 9999);
  assert.equal(created.commercialState, "not_contracted");
});

test("buildCompositionHistoryEntries detecta inclusão, opcional, cortesia, remoção e desconto — só decisões relevantes", () => {
  const before = [
    service({ id: "s1", commercialState: "not_contracted", included: false, name: "A" }),
    service({ id: "s2", commercialState: "included", name: "B", individualDiscountCents: 0 }),
    service({ id: "s3", commercialState: "included", name: "C" }),
  ];
  const after = [
    withCommercialState(before[0], "included"),
    { ...before[1], individualDiscountCents: 500 },
    // s3 removido
    createCustomService(),
  ];
  const entries = buildCompositionHistoryEntries(before, after, "2026-08-07T10:00:00.000Z");
  const actions = entries.map((e) => e.action).sort();
  assert.deepEqual(actions, ["discount_applied", "service_included", "service_removed"]);
});

test("buildCompositionHistoryEntries não gera entrada para uma linha que só volta a 'não contratado' (fora do vocabulário fechado)", () => {
  const before = [service({ id: "s1", commercialState: "included" })];
  const after = [withCommercialState(before[0], "not_contracted")];
  assert.deepEqual(buildCompositionHistoryEntries(before, after, "2026-08-07T10:00:00.000Z"), []);
});

test("buildCompositionHistoryEntries não gera nada quando nada muda (edição de horas/nome não é decisão comercial)", () => {
  const before = [service({ id: "s1", estimatedHours: 10 })];
  const after = [{ ...before[0], estimatedHours: 40, notes: "revisar" }];
  assert.deepEqual(buildCompositionHistoryEntries(before, after, "2026-08-07T10:00:00.000Z"), []);
});

test("appendCompositionHistory só acrescenta quando há mudança relevante, sempre com um resumo composition_saved", () => {
  const before: FeeServiceInput[] = [];
  const after = [service({ id: "s1", commercialState: "included" })];
  const appended = appendCompositionHistory([], before, after, "2026-08-07T10:00:00.000Z");
  assert.equal(appended.length, 2);
  assert.equal(appended[appended.length - 1].action, "composition_saved");
  const unchanged = appendCompositionHistory(appended, after, after, "2026-08-07T11:00:00.000Z");
  assert.equal(unchanged, appended, "salvar sem mudar a composição não acrescenta nada (mesma referência)");
});

test("appendCompositionHistory retém no máximo os últimos 200 registros", () => {
  let history: ReturnType<typeof appendCompositionHistory> = [];
  let previous: FeeServiceInput[] = [];
  for (let i = 0; i < 80; i += 1) {
    const next = [...previous, service({ id: `s${i}`, commercialState: "included", name: `Serviço ${i}` })];
    history = appendCompositionHistory(history, previous, next, `2026-08-07T10:${String(i % 60).padStart(2, "0")}:00.000Z`);
    previous = next;
  }
  assert.ok(history.length <= 200);
});

test("serviceCommercialStateLabels cobre os quatro estados com rótulos em português", () => {
  assert.equal(serviceCommercialStateLabels.included, "Incluído");
  assert.equal(serviceCommercialStateLabels.optional, "Opcional");
  assert.equal(serviceCommercialStateLabels.complimentary, "Cortesia");
  assert.equal(serviceCommercialStateLabels.not_contracted, "Não contratado");
});
