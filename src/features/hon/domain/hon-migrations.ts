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
