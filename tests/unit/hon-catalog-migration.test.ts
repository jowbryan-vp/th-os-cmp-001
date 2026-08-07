import assert from "node:assert/strict";
import test from "node:test";
import { serviceCategoryLabels, serviceCategoryOrder } from "../../src/features/hon/services/hon-catalog-content";
import { migrateServiceCatalog, migrateServiceCatalogItem } from "../../src/features/hon/domain/hon-migrations";
import { serviceCatalogItemSchema } from "../../src/features/hon/domain/hon-schemas";
import { defaultServiceCatalog } from "../../src/features/hon/services/hon-presets";

// Registro no formato anterior ao HON-002B: sem category, descrições, entregáveis/exclusões/
// premissas nem displayOrder. É exatamente o que estaria salvo no IndexedDB de uma instalação
// que já usou o catálogo antes desta fase.
function legacyCadastralSurvey() {
  return {
    id: "service-cadastral_survey", version: "1.0.0", code: "cadastral_survey", name: "Levantamento cadastral", stage: "levantamento",
    calculationMethod: "hours", baseHours: 12, minimumHours: 0, unit: "hora", responsible: "Arquiteto responsável",
    execution: "internal", defaultComplexity: "simple", includedRevisionRounds: 0, includedVisits: 0,
    bim: false, risk: "low", minimumValueCents: 0, active: true,
    source: "Preset inicial HON-001", confidence: "unvalidated", notes: "Calibrado no projeto TH-2026-001.",
  };
}

test("migra item v1 para v2: preenche os campos novos com o conteúdo curado do código reconhecido", () => {
  const migrated = migrateServiceCatalogItem(legacyCadastralSurvey()) as Record<string, unknown>;
  assert.equal(migrated.category, "diagnosis");
  assert.equal(typeof migrated.clientDescription, "string");
  assert.ok((migrated.clientDescription as string).length > 0);
  assert.equal(typeof migrated.technicalDescription, "string");
  assert.ok((migrated.technicalDescription as string).length > 0);
  assert.ok(Array.isArray(migrated.deliverables) && (migrated.deliverables as unknown[]).length > 0);
  assert.equal(typeof migrated.displayOrder, "number");
});

test("migração preserva id, code, name e todos os parâmetros de cálculo do registro antigo", () => {
  const legacy = legacyCadastralSurvey();
  const migrated = migrateServiceCatalogItem(legacy) as Record<string, unknown>;
  assert.equal(migrated.id, legacy.id);
  assert.equal(migrated.code, legacy.code);
  assert.equal(migrated.name, legacy.name);
  assert.equal(migrated.baseHours, legacy.baseHours);
  assert.equal(migrated.minimumHours, legacy.minimumHours);
  assert.equal(migrated.execution, legacy.execution);
  assert.equal(migrated.notes, legacy.notes);
  assert.equal(migrated.confidence, legacy.confidence);
});

test("migração resulta em um objeto que passa no schema estrito (aceita registro antigo sem os campos novos)", () => {
  const migrated = migrateServiceCatalogItem(legacyCadastralSurvey());
  assert.doesNotThrow(() => serviceCatalogItemSchema.parse(migrated));
});

test("arrays nunca ficam undefined, mesmo quando o registro antigo não tem os campos", () => {
  const migrated = migrateServiceCatalogItem(legacyCadastralSurvey()) as Record<string, unknown>;
  assert.ok(Array.isArray(migrated.deliverables));
  assert.ok(Array.isArray(migrated.exclusions));
  assert.ok(Array.isArray(migrated.assumptions));
});

test("item personalizado (código desconhecido) recebe defaults seguros sem perder o conteúdo original", () => {
  const custom = { id: "service-custom-1", version: "1.0.0", code: "custom_survey_drone", name: "Levantamento aéreo com drone", stage: "levantamento",
    calculationMethod: "fixed", baseHours: 0, minimumHours: 0, unit: "serviço", responsible: "Parceiro", execution: "partner",
    defaultComplexity: "simple", includedRevisionRounds: 0, includedVisits: 0, bim: false, risk: "low", minimumValueCents: 50_000,
    active: true, source: "Cadastrado manualmente pelo arquiteto", confidence: "low", notes: "Fornecedor parceiro local." };
  const migrated = migrateServiceCatalogItem(custom) as Record<string, unknown>;
  assert.equal(migrated.name, "Levantamento aéreo com drone");
  assert.equal(migrated.source, "Cadastrado manualmente pelo arquiteto");
  assert.equal(migrated.category, "complementary");
  assert.equal(migrated.clientDescription, "");
  assert.deepEqual(migrated.deliverables, []);
  assert.doesNotThrow(() => serviceCatalogItemSchema.parse(migrated));
});

test("migração é idempotente: migrar um item já migrado não altera nada", () => {
  const once = migrateServiceCatalogItem(legacyCadastralSurvey());
  const twice = migrateServiceCatalogItem(once);
  assert.deepEqual(once, twice);
});

test("migração não sobrescreve um campo novo já presente (ex.: category customizada pelo usuário)", () => {
  const legacy = legacyCadastralSurvey() as Record<string, unknown>;
  const withCustomCategory = { ...legacy, category: "legal", clientDescription: "Descrição customizada pelo usuário." };
  const migrated = migrateServiceCatalogItem(withCustomCategory) as Record<string, unknown>;
  assert.equal(migrated.category, "legal");
  assert.equal(migrated.clientDescription, "Descrição customizada pelo usuário.");
});

test("migrateServiceCatalog aplica a migração em lote preservando a ordem", () => {
  const items = [legacyCadastralSurvey(), legacyCadastralSurvey()];
  const migrated = migrateServiceCatalog(items);
  assert.equal(migrated.length, 2);
});

test("defaultServiceCatalog tem exatamente 40 itens, todos com categoria válida e descrições não vazias", () => {
  assert.equal(defaultServiceCatalog.length, 40);
  for (const item of defaultServiceCatalog) {
    assert.ok(serviceCategoryOrder.includes(item.category), `categoria inválida em ${item.code}: ${item.category}`);
    assert.ok(item.clientDescription.length > 0, `clientDescription vazia em ${item.code}`);
    assert.ok(item.technicalDescription.length > 0, `technicalDescription vazia em ${item.code}`);
    assert.ok(Array.isArray(item.deliverables));
    assert.ok(Array.isArray(item.exclusions));
    assert.ok(Array.isArray(item.assumptions));
    assert.equal(typeof item.displayOrder, "number");
  }
});

test("defaultServiceCatalog passa no schema estrito e cada item resolve para um rótulo de categoria", () => {
  for (const item of defaultServiceCatalog) {
    assert.doesNotThrow(() => serviceCatalogItemSchema.parse(item));
    assert.ok(serviceCategoryLabels[item.category]);
  }
});

test("nenhuma descrição de serviço é genérica a ponto de repetir entre dois serviços distintos", () => {
  const seen = new Set<string>();
  for (const item of defaultServiceCatalog) {
    assert.ok(!seen.has(item.clientDescription), `descrição repetida detectada em ${item.code}`);
    seen.add(item.clientDescription);
  }
});
