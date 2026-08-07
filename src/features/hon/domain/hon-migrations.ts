import { fallbackServiceCatalogContent, serviceCatalogContent } from "../services/hon-catalog-content";

type Loose = Record<string, unknown>;

function contentForCode(code: unknown) {
  if (typeof code === "string" && code in serviceCatalogContent) return serviceCatalogContent[code];
  return fallbackServiceCatalogContent;
}

// Aceita um ServiceCatalogItem no formato anterior ao HON-002B (sem category, descrições,
// entregáveis/exclusões/premissas e displayOrder) e preenche apenas os campos ausentes — com o
// conteúdo curado do serviço (por código, quando reconhecido) ou defaults seguros (item
// personalizado/código desconhecido). Nunca sobrescreve um campo já presente: idempotente e
// preserva qualquer customização já salva pelo usuário, além de id, code, name e todos os
// parâmetros de cálculo (baseHours, minimumHours, execution, risk, minimumValueCents etc.),
// que este migrador não toca.
export function migrateServiceCatalogItem(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const source = raw as Loose;
  const fallback = contentForCode(source.code);
  return {
    ...source,
    category: source.category ?? fallback.category,
    clientDescription: typeof source.clientDescription === "string" ? source.clientDescription : fallback.clientDescription,
    technicalDescription: typeof source.technicalDescription === "string" ? source.technicalDescription : fallback.technicalDescription,
    deliverables: Array.isArray(source.deliverables) ? source.deliverables : fallback.deliverables,
    exclusions: Array.isArray(source.exclusions) ? source.exclusions : fallback.exclusions,
    assumptions: Array.isArray(source.assumptions) ? source.assumptions : fallback.assumptions,
    displayOrder: typeof source.displayOrder === "number" ? source.displayOrder : fallback.displayOrder,
  };
}

export function migrateServiceCatalog(rawItems: unknown[]): unknown[] {
  return rawItems.map(migrateServiceCatalogItem);
}

const validCommercialStates = new Set(["included", "optional", "complimentary", "not_contracted"]);

// Aceita um FeeServiceInput no formato anterior ao HON-002C (sem category, displayOrder,
// commercialState, quantity, individualDiscountCents e customDescription) e preenche apenas o
// que falta. `commercialState` é recomputado a partir do `included` legado quando ausente —
// e os três booleanos derivados (included/optional/complimentary) são SEMPRE recalculados a
// partir de `commercialState` (legado ou já presente), nunca lidos direto de um valor salvo:
// isso também autocorrige qualquer combinação incoerente que porventura exista em dados
// gravados fora do app (edição manual de backup, por exemplo). category/displayOrder usam o
// mesmo conteúdo curado por código do catálogo (hon-catalog-content.ts) já usado para migrar
// ServiceCatalogItem — evita duas fontes de verdade para o mesmo mapeamento código→categoria.
// Nunca sobrescreve um campo já presente: idempotente, preserva id/code/name/estimatedHours/
// hourlyCostCents/fixedCostCents/minimumValueCents/catalogItemId/notes e qualquer
// customização já salva.
export function migrateFeeServiceInput(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const source = raw as Loose;
  const fallback = contentForCode(source.code);
  const legacyIncluded = typeof source.included === "boolean" ? source.included : false;
  const commercialState = typeof source.commercialState === "string" && validCommercialStates.has(source.commercialState)
    ? source.commercialState
    : legacyIncluded ? "included" : "not_contracted";
  return {
    ...source,
    category: source.category ?? fallback.category,
    displayOrder: typeof source.displayOrder === "number" ? source.displayOrder : fallback.displayOrder,
    commercialState,
    included: commercialState === "included",
    optional: commercialState === "optional",
    complimentary: commercialState === "complimentary",
    quantity: typeof source.quantity === "number" && source.quantity > 0 ? source.quantity : 1,
    individualDiscountCents: typeof source.individualDiscountCents === "number" && source.individualDiscountCents >= 0 ? source.individualDiscountCents : 0,
    customDescription: source.customDescription && typeof source.customDescription === "object" ? source.customDescription : null,
  };
}

// Aplica migrateFeeServiceInput a cada linha de `services` de um FeeCalculationStudy (formato
// anterior ao HON-002C). `compositionHistory` não precisa de migração aqui: o schema zod já
// preenche [] por padrão (opcional+default), já que um array vazio é um valor válido — ao
// contrário de FeeServiceInput, cujos campos novos exigem conteúdo real (categoria, estado).
export function migrateFeeStudy(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const source = raw as Loose;
  if (!Array.isArray(source.services)) return raw;
  return { ...source, services: source.services.map(migrateFeeServiceInput) };
}

// Mesma migração de serviços para FeeScenario (cenários carregam uma cópia própria de
// `services`, criada por structuredClone em createScenario).
export function migrateFeeScenario(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const source = raw as Loose;
  if (!Array.isArray(source.services)) return raw;
  return { ...source, services: source.services.map(migrateFeeServiceInput) };
}

// FeeSnapshot é imutável, mas seu `payload` é um FeeCalculationStudy completo gravado antes do
// HON-002C — precisa da mesma migração de services para continuar validando na leitura.
export function migrateFeeSnapshot(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const source = raw as Loose;
  if (!source.payload || typeof source.payload !== "object") return raw;
  return { ...source, payload: migrateFeeStudy(source.payload) };
}
